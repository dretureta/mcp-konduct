import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Folder, ExternalLink, Link2, Unlink2, ChevronDown, Copy, Pencil } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/common/Card.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Loading } from '../components/common/Loading.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';
import { projectApi } from '../utils/api';
import { Project, ProjectFullResponse, Server } from '../types';

export const Projects: React.FC = () => {
  const { projects, servers, isLoading, createProject, updateProject, deleteProject, refreshData } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [managingProject, setManagingProject] = useState<Project | null>(null);
  const [projectServers, setProjectServers] = useState<Server[]>([]);
  const [isManageLoading, setIsManageLoading] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<Record<string, ProjectFullResponse>>({});
  const [loadingProjectDetails, setLoadingProjectDetails] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createProject(newProjectName, newProjectDescription.trim() || undefined);
      setNewProjectName('');
      setNewProjectDescription('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && projects.length === 0) {
    return <Loading label="Syncing projects..." />;
  }

  const openManageModal = async (project: Project) => {
    setManagingProject(project);
    setIsManageModalOpen(true);
    setIsManageLoading(true);
    try {
      const res = await projectApi.getProjectServers(project.id);
      setProjectServers(res.data || []);
    } finally {
      setIsManageLoading(false);
    }
  };

  const closeManageModal = () => {
    setIsManageModalOpen(false);
    setManagingProject(null);
    setProjectServers([]);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
  };

  const closeEditModal = () => {
    setEditingProject(null);
    setEditProjectName('');
    setEditProjectDescription('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;

    setIsEditSubmitting(true);
    try {
      const trimmedDescription = editProjectDescription.trim();
      const nextDescription = trimmedDescription.length > 0
        ? trimmedDescription
        : editingProject.description
          ? null
          : undefined;

      await updateProject(editingProject.id, editProjectName.trim(), nextDescription);
      closeEditModal();
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const addServerToProject = async (serverId: string) => {
    if (!managingProject) return;
    setIsManageLoading(true);
    try {
      await projectApi.addServerToProject(managingProject.id, serverId);
      const res = await projectApi.getProjectServers(managingProject.id);
      setProjectServers(res.data || []);
      await refreshData();
    } finally {
      setIsManageLoading(false);
    }
  };

  const removeServerFromProject = async (serverId: string) => {
    if (!managingProject) return;
    setIsManageLoading(true);
    try {
      await projectApi.removeServerFromProject(managingProject.id, serverId);
      const res = await projectApi.getProjectServers(managingProject.id);
      setProjectServers(res.data || []);
      await refreshData();
    } finally {
      setIsManageLoading(false);
    }
  };

  const projectServerIds = new Set(projectServers.map((server) => server.id));
  const availableServers = servers.filter((server) => !projectServerIds.has(server.id));

  const toggleProjectDetails = async (project: Project) => {
    if (expandedProjectId === project.id) {
      setExpandedProjectId(null);
      return;
    }

    setExpandedProjectId(project.id);
    if (projectDetails[project.id]) {
      return;
    }

    setLoadingProjectDetails(project.id);
    try {
      const response = await projectApi.getProjectFull(project.id);
      setProjectDetails((prev) => ({ ...prev, [project.id]: response.data }));
    } finally {
      setLoadingProjectDetails(null);
    }
  };

  const copyProjectCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
    } catch (error) {
      console.error('Failed to copy project command:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Projects</h1>
          <p className="text-muted-foreground font-medium">Group your servers into logical projects</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus size={20} />
          <span>New Project</span>
        </Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Project Name"
            required
            autoFocus
            placeholder="e.g., Marketing AI, Dev Environment"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            helperText="A clear, concise name for your collection of servers."
          />
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Description</label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="What is this project for?"
              rows={3}
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional context shown on project cards to help explain the collection.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newProjectName.trim()}
              isLoading={isSubmitting}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isManageModalOpen}
        onClose={closeManageModal}
        title={managingProject ? `Manage Servers - ${managingProject.name}` : 'Manage Servers'}
      >
        {isManageLoading ? (
          <Loading label="Loading project servers..." className="py-10" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Connected Servers</h4>
              {projectServers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted">
                  No servers linked yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectServers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{server.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">{server.transport}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServerFromProject(server.id)}
                        disabled={isManageLoading}
                        className="text-error hover:text-error"
                      >
                        <Unlink2 size={14} />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Available Servers</h4>
              {availableServers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted">
                  All servers are already connected.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableServers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{server.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">{server.transport}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addServerToProject(server.id)}
                        disabled={isManageLoading}
                        className="text-success hover:text-success"
                      >
                        <Link2 size={14} />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editingProject} onClose={closeEditModal} title={editingProject ? `Edit ${editingProject.name}` : 'Edit Project'}>
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <Input
            label="Project Name"
            required
            autoFocus
            placeholder="e.g., Marketing AI, Dev Environment"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            helperText="Update the display name for this project."
          />
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Description</label>
            <textarea
              className="w-full bg-muted border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="What is this project for?"
              rows={3}
              value={editProjectDescription}
              onChange={(e) => setEditProjectDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional context shown on project cards to explain the collection.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isEditSubmitting || !editProjectName.trim()} isLoading={isEditSubmitting}>
              Update Project
            </Button>
          </div>
        </form>
      </Modal>

      {projects.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title="No projects found"
          description="Projects allow you to organize and manage groups of MCP servers together. Create your first project to get started."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              Create Your First Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} hover className="group h-full flex flex-col">
              <div className="p-6 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Folder size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip content="Edit Details">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit project"
                        onClick={() => openEditModal(project)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil size={18} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete Project">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm('Delete this project? This will not delete the connected servers.')) {
                            deleteProject(project.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-error"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleProjectDetails(project)}
                  className="justify-start px-0 text-muted-foreground hover:text-primary"
                >
                  <ChevronDown
                    size={14}
                    className={expandedProjectId === project.id ? 'rotate-180 transition-transform' : 'transition-transform'}
                  />
                  {expandedProjectId === project.id ? 'Hide project scope' : 'Show project scope'}
                </Button>
                {expandedProjectId === project.id && (
                  <div className="space-y-4 rounded-xl border border-border p-4 bg-muted">
                    {loadingProjectDetails === project.id ? (
                      <Loading label="Loading project scope..." className="py-4" />
                    ) : projectDetails[project.id] ? (
                      <>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                            Servers ({projectDetails[project.id].summary.serverCount})
                          </p>
                          {projectDetails[project.id].servers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No linked servers</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {projectDetails[project.id].servers.map((server) => (
                                <Badge key={server.id} variant="secondary" size="sm">
                                  {server.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                            Tools ({projectDetails[project.id].summary.toolCount})
                          </p>
                          {projectDetails[project.id].tools.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No discovered tools in this scope</p>
                          ) : (
                            <div className="max-h-28 overflow-y-auto rounded-lg border border-border bg-surface px-2 py-1">
                              {projectDetails[project.id].tools.map((tool) => (
                                <p key={tool.id} className="text-[11px] font-mono text-foreground py-1">
                                  {tool.toolName}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                            MCP command
                          </p>
                          <div className="rounded-lg bg-foreground text-foreground-inverted text-[11px] font-mono px-3 py-2 break-all">
                            {projectDetails[project.id].config.command}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyProjectCommand(projectDetails[project.id].config.command)}
                            className="mt-2 text-muted-foreground hover:text-primary"
                          >
                            <Copy size={13} />
                            Copy command
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between rounded-b-2xl">
                <Badge variant="secondary" size="md">
                  {project.serverCount || 0} Servers
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary font-bold hover:gap-2 transition-all"
                  onClick={() => openManageModal(project)}
                >
                  Manage <ExternalLink size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
