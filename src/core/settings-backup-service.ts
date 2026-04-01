import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { db } from '../config/db.js';

const isUUID = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const BackupServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().nullable().optional(),
  args: z.string().nullable().optional(),
  env: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  enabled: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const BackupToolSchema = z.object({
  id: z.string(),
  server_id: z.string(),
  tool_name: z.string(),
  enabled: z.number(),
  discovered_at: z.string().optional(),
});

const BackupProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

const BackupProjectServerSchema = z.object({
  projectId: z.string(),
  serverId: z.string(),
});

export const BackupPayloadSchema = z.object({
  version: z.literal('konduct-backup-v1'),
  exportedAt: z.string(),
  appVersion: z.string(),
  data: z.object({
    servers: z.array(BackupServerSchema),
    tools: z.array(BackupToolSchema),
    projects: z.array(BackupProjectSchema),
    projectServers: z.array(BackupProjectServerSchema),
  }),
});

export type BackupPayload = z.infer<typeof BackupPayloadSchema>;
export type ImportMode = 'merge' | 'replace';

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  removed: number;
  errors: number;
}

export const emptySummary = (): ImportSummary => ({
  created: 0,
  updated: 0,
  skipped: 0,
  removed: 0,
  errors: 0,
});

const getAppVersion = (): string => {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    return 'unknown';
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as Record<string, unknown>;
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unknown';
  }
};

const redactEnvString = (env: string | null | undefined): string | null | undefined => {
  if (!env) {
    return env;
  }

  try {
    const parsed = JSON.parse(env) as Record<string, string>;
    const redacted = Object.fromEntries(Object.keys(parsed).map((key) => [key, '[REDACTED]']));
    return JSON.stringify(redacted);
  } catch {
    return '[REDACTED]';
  }
};

export const buildBackupPayload = (includeSensitive = false): BackupPayload => {
  const servers = db.prepare('SELECT * FROM servers ORDER BY name').all() as Array<z.infer<typeof BackupServerSchema>>;
  const tools = db.prepare('SELECT * FROM tools ORDER BY server_id, tool_name').all() as Array<z.infer<typeof BackupToolSchema>>;
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all() as Array<z.infer<typeof BackupProjectSchema>>;
  const projectServerRows = db.prepare('SELECT project_id, server_id FROM project_servers ORDER BY project_id, server_id').all() as Array<Record<string, unknown>>;

  const payload: BackupPayload = {
    version: 'konduct-backup-v1',
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    data: {
      servers: servers.map((server) => ({
        ...server,
        env: includeSensitive ? server.env : redactEnvString(server.env),
      })),
      tools,
      projects,
      projectServers: projectServerRows.map((row) => ({
        projectId: row.project_id as string,
        serverId: row.server_id as string,
      })),
    },
  };

  return BackupPayloadSchema.parse(payload);
};

export const analyzeImportImpact = (payload: BackupPayload, mode: ImportMode): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  if (mode === 'replace') {
    const currentServers = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
    const currentTools = db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
    const currentProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const currentRelations = db.prepare('SELECT COUNT(*) as count FROM project_servers').get() as { count: number };

    summary.removed = currentServers.count + currentTools.count + currentProjects.count + currentRelations.count;
    summary.created = payload.data.servers.length + payload.data.tools.length + payload.data.projects.length + payload.data.projectServers.length;
    messages.push('Replace mode will overwrite current configuration data.');
    return { summary, messages };
  }

  const existingServersById = new Set((db.prepare('SELECT id FROM servers').all() as Array<Record<string, unknown>>).map((row) => row.id as string));
  const existingServerNames = new Set((db.prepare('SELECT name FROM servers').all() as Array<Record<string, unknown>>).map((row) => row.name as string));
  const existingToolRows = db.prepare('SELECT id, uuid FROM tools').all() as Array<Record<string, unknown>>;
  const existingToolsById = new Set(existingToolRows.map((row) => row.id as string));
  const existingToolsByUuid = new Set(existingToolRows.filter((row) => row.uuid).map((row) => row.uuid as string));
  const existingProjectsById = new Set((db.prepare('SELECT id FROM projects').all() as Array<Record<string, unknown>>).map((row) => row.id as string));
  const existingProjectNames = new Set((db.prepare('SELECT name FROM projects').all() as Array<Record<string, unknown>>).map((row) => row.name as string));
  const existingRelations = new Set(
    (db.prepare('SELECT project_id, server_id FROM project_servers').all() as Array<Record<string, unknown>>)
      .map((row) => `${row.project_id as string}:${row.server_id as string}`)
  );

  for (const server of payload.data.servers) {
    if (existingServersById.has(server.id) || existingServerNames.has(server.name)) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  for (const tool of payload.data.tools) {
    const isExistingId = existingToolsById.has(tool.id);
    const isExistingUuid = isUUID(tool.id) && existingToolsByUuid.has(tool.id);
    if (isExistingId || isExistingUuid) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  for (const project of payload.data.projects) {
    if (existingProjectsById.has(project.id) || existingProjectNames.has(project.name)) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  const importProjectIds = new Set(payload.data.projects.map((project) => project.id));
  const importServerIds = new Set(payload.data.servers.map((server) => server.id));

  for (const relation of payload.data.projectServers) {
    const projectKnown = importProjectIds.has(relation.projectId) || existingProjectsById.has(relation.projectId);
    const serverKnown = importServerIds.has(relation.serverId) || existingServersById.has(relation.serverId);

    if (!projectKnown || !serverKnown) {
      summary.errors += 1;
      messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
    } else if (existingRelations.has(`${relation.projectId}:${relation.serverId}`)) {
      summary.skipped += 1;
    } else {
      summary.created += 1;
    }
  }

  return { summary, messages };
};

const applyImportMerge = (payload: BackupPayload): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  const runMerge = db.transaction(() => {
    const existingServers = db.prepare('SELECT id, name FROM servers').all() as Array<Record<string, unknown>>;
    const existingProjects = db.prepare('SELECT id, name FROM projects').all() as Array<Record<string, unknown>>;

    const serverIdByName = new Map(existingServers.map((row) => [row.name as string, row.id as string]));
    const serverExistsById = new Set(existingServers.map((row) => row.id as string));
    const projectIdByName = new Map(existingProjects.map((row) => [row.name as string, row.id as string]));
    const projectExistsById = new Set(existingProjects.map((row) => row.id as string));

    const serverIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();

    const updateServerStmt = db.prepare(`
    UPDATE servers
    SET name = ?, transport = ?, command = ?, args = ?, env = ?, url = ?, enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
    const insertServerStmt = db.prepare(`
    INSERT INTO servers (id, name, transport, command, args, env, url, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
  `);

    for (const server of payload.data.servers) {
      let targetServerId = server.id;

      if (serverExistsById.has(server.id)) {
        summary.updated += 1;
      } else {
        const byNameId = serverIdByName.get(server.name);
        if (byNameId) {
          targetServerId = byNameId;
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
      }

      if (serverExistsById.has(targetServerId)) {
        updateServerStmt.run(server.name, server.transport, server.command ?? null, server.args ?? null, server.env ?? null, server.url ?? null, server.enabled, targetServerId);
      } else {
        insertServerStmt.run(targetServerId, server.name, server.transport, server.command ?? null, server.args ?? null, server.env ?? null, server.url ?? null, server.enabled, server.created_at ?? null, server.updated_at ?? null);
        serverExistsById.add(targetServerId);
        serverIdByName.set(server.name, targetServerId);
      }

      serverIdMap.set(server.id, targetServerId);
    }

    const updateProjectStmt = db.prepare(`
    UPDATE projects
    SET name = ?, description = ?
    WHERE id = ?
  `);
    const insertProjectStmt = db.prepare(`
    INSERT INTO projects (id, name, description, created_at)
    VALUES (?, ?, ?, COALESCE(?, datetime('now')))
  `);

    for (const project of payload.data.projects) {
      let targetProjectId = project.id;

      if (projectExistsById.has(project.id)) {
        summary.updated += 1;
      } else {
        const byNameId = projectIdByName.get(project.name);
        if (byNameId) {
          targetProjectId = byNameId;
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
      }

      if (projectExistsById.has(targetProjectId)) {
        updateProjectStmt.run(project.name, project.description ?? null, targetProjectId);
      } else {
        insertProjectStmt.run(targetProjectId, project.name, project.description ?? null, project.created_at ?? null);
        projectExistsById.add(targetProjectId);
        projectIdByName.set(project.name, targetProjectId);
      }

      projectIdMap.set(project.id, targetProjectId);
    }

    const existingToolRows = db.prepare('SELECT id, uuid FROM tools').all() as Array<Record<string, unknown>>;
    const existingToolsById = new Set(existingToolRows.map((row) => row.id as string));
    const existingToolsByUuid = new Set(existingToolRows.filter((row) => row.uuid).map((row) => row.uuid as string));
    const updateToolStmt = db.prepare('UPDATE tools SET server_id = ?, tool_name = ?, enabled = ? WHERE id = ?');
    const insertToolStmt = db.prepare(`
    INSERT INTO tools (id, uuid, server_id, tool_name, enabled, discovered_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
  `);

    for (const tool of payload.data.tools) {
      const resolvedServerId = serverIdMap.get(tool.server_id) ?? tool.server_id;
      let resolvedToolId: string;
      let resolvedUuid: string | undefined;

      if (isUUID(tool.id) && existingToolsByUuid.has(tool.id)) {
        resolvedToolId = tool.id;
        resolvedUuid = tool.id;
      } else if (existingToolsById.has(tool.id)) {
        resolvedToolId = tool.id;
      } else {
        resolvedUuid = randomUUID();
        resolvedToolId = `${resolvedServerId}__${tool.tool_name}`;
      }

      if (existingToolsById.has(resolvedToolId) || (resolvedUuid && existingToolsByUuid.has(resolvedUuid))) {
        updateToolStmt.run(resolvedServerId, tool.tool_name, tool.enabled, resolvedToolId);
        summary.updated += 1;
      } else {
        insertToolStmt.run(resolvedToolId, resolvedUuid ?? null, resolvedServerId, tool.tool_name, tool.enabled, tool.discovered_at ?? null);
        existingToolsById.add(resolvedToolId);
        if (resolvedUuid) existingToolsByUuid.add(resolvedUuid);
        summary.created += 1;
      }
    }

    const insertRelationStmt = db.prepare('INSERT OR IGNORE INTO project_servers (project_id, server_id) VALUES (?, ?)');

    for (const relation of payload.data.projectServers) {
      const resolvedProjectId = projectIdMap.get(relation.projectId) ?? relation.projectId;
      const resolvedServerId = serverIdMap.get(relation.serverId) ?? relation.serverId;

      if (!projectExistsById.has(resolvedProjectId) || !serverExistsById.has(resolvedServerId)) {
        summary.errors += 1;
        messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
        continue;
      }

      const result = insertRelationStmt.run(resolvedProjectId, resolvedServerId);
      if (result.changes > 0) {
        summary.created += 1;
      } else {
        summary.skipped += 1;
      }
    }
  });

  runMerge();
  return { summary, messages };
};

const applyImportReplace = (payload: BackupPayload): { summary: ImportSummary; messages: string[] } => {
  const summary = emptySummary();
  const messages: string[] = [];

  const currentServers = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
  const currentTools = db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
  const currentProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  const currentRelations = db.prepare('SELECT COUNT(*) as count FROM project_servers').get() as { count: number };
  summary.removed = currentServers.count + currentTools.count + currentProjects.count + currentRelations.count;

  const serverIds = new Set(payload.data.servers.map((server) => server.id));
  const projectIds = new Set(payload.data.projects.map((project) => project.id));

  const runReplace = db.transaction(() => {
    db.prepare('DELETE FROM project_servers').run();
    db.prepare('DELETE FROM tools').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM servers').run();

    const insertServerStmt = db.prepare(`
      INSERT INTO servers (id, name, transport, command, args, env, url, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
    const insertToolStmt = db.prepare(`
      INSERT INTO tools (id, server_id, tool_name, enabled, discovered_at)
      VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);
    const insertProjectStmt = db.prepare(`
      INSERT INTO projects (id, name, description, created_at)
      VALUES (?, ?, ?, COALESCE(?, datetime('now')))
    `);
    const insertRelationStmt = db.prepare('INSERT OR IGNORE INTO project_servers (project_id, server_id) VALUES (?, ?)');

    for (const server of payload.data.servers) {
      insertServerStmt.run(server.id, server.name, server.transport, server.command ?? null, server.args ?? null, server.env ?? null, server.url ?? null, server.enabled, server.created_at ?? null, server.updated_at ?? null);
      summary.created += 1;
    }

    for (const tool of payload.data.tools) {
      if (!serverIds.has(tool.server_id)) {
        summary.errors += 1;
        messages.push(`Tool skipped: server '${tool.server_id}' not found.`);
        continue;
      }

      insertToolStmt.run(tool.id, tool.server_id, tool.tool_name, tool.enabled, tool.discovered_at ?? null);
      summary.created += 1;
    }

    for (const project of payload.data.projects) {
      insertProjectStmt.run(project.id, project.name, project.description ?? null, project.created_at ?? null);
      summary.created += 1;
    }

    for (const relation of payload.data.projectServers) {
      if (!projectIds.has(relation.projectId) || !serverIds.has(relation.serverId)) {
        summary.errors += 1;
        messages.push(`Relation skipped: project '${relation.projectId}' or server '${relation.serverId}' not found.`);
        continue;
      }

      const result = insertRelationStmt.run(relation.projectId, relation.serverId);
      if (result.changes > 0) {
        summary.created += 1;
      } else {
        summary.skipped += 1;
      }
    }
  });

  runReplace();
  return { summary, messages };
};

export const applyImportPayload = (payload: BackupPayload, mode: ImportMode): { summary: ImportSummary; messages: string[] } => {
  if (mode === 'replace') {
    return applyImportReplace(payload);
  }

  return applyImportMerge(payload);
};
