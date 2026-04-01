import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const mocks = vi.hoisted(() => {
  return {
    mockGetServer: vi.fn(),
    mockListServers: vi.fn(),
    mockAddServer: vi.fn(),
    mockUpdateServer: vi.fn(),
    mockGetProject: vi.fn(),
    mockGetProjectServers: vi.fn(),
    mockGetProjectTools: vi.fn(),
    mockDbAll: vi.fn(),
    mockDbGet: vi.fn(),
  };
});

vi.mock('../core/registry.js', () => ({
  registry: {
    getServer: mocks.mockGetServer,
    listServers: mocks.mockListServers,
    addServer: mocks.mockAddServer,
    updateServer: mocks.mockUpdateServer,
    getProject: mocks.mockGetProject,
    getProjectServers: mocks.mockGetProjectServers,
    getProjectTools: mocks.mockGetProjectTools,
  },
}));

vi.mock('../config/db.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: mocks.mockDbGet,
      all: mocks.mockDbAll,
      run: vi.fn(() => ({ changes: 1 })),
    })),
    exec: vi.fn(),
  },
  getDbPath: vi.fn(() => '/test/db/path'),
}));

// Import app AFTER mocks
import app from './index.js';

type App = typeof app;

// Helper to create test request
const createTestRequest = async (
  app: App,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> => {
  const url = new URL(path, 'http://localhost');

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  const init: RequestInit = {
    method,
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const request = new Request(url, init);
  return app.fetch(request);
};

describe('Security - Environment Variables Redaction', () => {
  // Server with real secrets
  const serverWithSecrets = {
    id: 'server-with-secrets',
    name: 'api-server',
    transport: 'stdio' as const,
    command: 'node',
    args: ['server.js'],
    env: {
      API_KEY: 'super-secret-key-12345',
      DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/prod',
      PRIVATE_TOKEN: 'ghp_verylongsecrettoken',
    },
    url: undefined,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockAddServer.mockReturnValue('new-server-id');
  });

  // =============================================================================
  // Test Suite 1: GET /api/servers - Must NOT expose real env values
  // =============================================================================
  describe('GET /api/servers', () => {
    it('should NOT expose real API_KEY value in env', async () => {
      mocks.mockListServers.mockReturnValue([serverWithSecrets]);

      const response = await createTestRequest(app, 'GET', '/api/servers');
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toHaveLength(1);

      const server = json[0];
      // Real value must NOT appear in response
      expect(JSON.stringify(server)).not.toContain('super-secret-key-12345');
      // Env should be redacted or masked
      if (server.env) {
        expect(Object.values(server.env)).not.toContain('super-secret-key-12345');
      }
    });

    it('should NOT expose real DATABASE_URL in env', async () => {
      mocks.mockListServers.mockReturnValue([serverWithSecrets]);

      const response = await createTestRequest(app, 'GET', '/api/servers');
      const json = await response.json();

      // Real credentials must NOT appear
      expect(JSON.stringify(json)).not.toContain('postgresql://user:pass@db.example.com');
      expect(JSON.stringify(json)).not.toContain('ghp_verylongsecrettoken');
    });

    it('should NOT expose any real secret values (comprehensive check)', async () => {
      mocks.mockListServers.mockReturnValue([serverWithSecrets]);

      const response = await createTestRequest(app, 'GET', '/api/servers');
      const json = await response.json();

      const responseStr = JSON.stringify(json);
      // These are the actual secret values that MUST NOT appear
      const secretValues = Object.values(serverWithSecrets.env!);
      for (const secret of secretValues) {
        expect(responseStr).not.toContain(secret);
      }
    });

    it('should return env with masked/redacted values when secrets exist', async () => {
      mocks.mockListServers.mockReturnValue([serverWithSecrets]);

      const response = await createTestRequest(app, 'GET', '/api/servers');
      const json = await response.json();

      const server = json[0];
      // If env is present, values should be redacted markers
      if (server.env) {
        const envValues = Object.values(server.env);
        // At least one value should be a redaction marker
        const hasRedaction = envValues.some(v =>
          v === '[REDACTED]' ||
          v === '***' ||
          v === '[HIDDEN]' ||
          (typeof v === 'string' && v.startsWith('[SECRET'))
        );
        expect(hasRedaction).toBe(true);
      }
    });
  });

  // =============================================================================
  // Test Suite 2: GET /api/servers/:id - Must NOT expose real env values
  // =============================================================================
  describe('GET /api/servers/:id', () => {
    it('should NOT expose real secrets in single server response', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'GET', '/api/servers/server-with-secrets');
      expect(response.status).toBe(200);

      const json = await response.json();
      const responseStr = JSON.stringify(json);

      // No real secret values should appear
      expect(responseStr).not.toContain('super-secret-key-12345');
      expect(responseStr).not.toContain('postgresql://user:pass@db.example.com');
      expect(responseStr).not.toContain('ghp_verylongsecrettoken');
    });

    it('should return env with redacted values in single server response', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'GET', '/api/servers/server-with-secrets');
      const json = await response.json();

      if (json.env) {
        const envValues = Object.values(json.env);
        const hasRedaction = envValues.some(v =>
          v === '[REDACTED]' ||
          v === '***' ||
          v === '[HIDDEN]' ||
          (typeof v === 'string' && v.startsWith('[SECRET'))
        );
        expect(hasRedaction).toBe(true);
      }
    });
  });

  // =============================================================================
  // Test Suite 3: POST /api/servers - Must NOT return real secrets in response
  // =============================================================================
  describe('POST /api/servers', () => {
    it('should NOT return real secrets in create response', async () => {
      const serverWithRealSecrets = {
        id: 'new-server-id',
        name: 'secure-server',
        transport: 'stdio' as const,
        command: 'node',
        args: ['app.js'],
        env: {
          SECRET_KEY: 'actual-secret-value-xyz',
          AWS_SECRET: 'AKIAIOSFODNN7EXAMPLE',
        },
        enabled: true,
      };

      mocks.mockGetServer.mockReturnValue(serverWithRealSecrets);

      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'secure-server',
          transport: 'stdio',
          command: 'node',
          args: ['app.js'],
          env: {
            SECRET_KEY: 'actual-secret-value-xyz',
            AWS_SECRET: 'AKIAIOSFODNN7EXAMPLE',
          },
        },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      const responseStr = JSON.stringify(json);

      // Real values must NOT be in response
      expect(responseStr).not.toContain('actual-secret-value-xyz');
      expect(responseStr).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should NOT return secrets even when creation fails partially', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'POST', '/api/servers', {
        body: {
          name: 'api-server',
          transport: 'stdio',
          command: 'node',
          env: {
            DATABASE_PASSWORD: 'real-db-password-123',
          },
        },
      });

      const json = await response.json();
      // Even if there's an error, secrets shouldn't leak
      expect(JSON.stringify(json)).not.toContain('real-db-password-123');
    });
  });

  // =============================================================================
  // Test Suite 4: POST /api/servers/:id/update - Must NOT return real secrets
  // =============================================================================
  describe('POST /api/servers/:id/update', () => {
    it('should NOT return real secrets in update response', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'POST', '/api/servers/server-with-secrets/update', {
        body: {
          name: 'api-server',
          transport: 'stdio',
          command: 'node',
          env: {
            NEW_API_KEY: 'brand-new-secret-abc',
            STRIPE_KEY: 'sk_live_51HxY2KZ...',
          },
        },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      const responseStr = JSON.stringify(json);

      // Real values must NOT be in response
      expect(responseStr).not.toContain('brand-new-secret-abc');
      expect(responseStr).not.toContain('sk_live_51HxY2KZ');
      // Original secrets should also be redacted
      expect(responseStr).not.toContain('super-secret-key-12345');
    });
  });

  // =============================================================================
  // Test Suite 5: Explicit opt-in for real secrets (if supported)
  // =============================================================================
  describe('Explicit secrets disclosure (opt-in)', () => {
    it('should expose real secrets when secrets=true is provided', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'GET', '/api/servers/server-with-secrets?secrets=true');
      expect(response.status).toBe(200);

      const json = await response.json();

      // With opt-in, real values SHOULD be visible (for legitimate use cases)
      if (json.env) {
        expect(json.env.API_KEY).toBe(serverWithSecrets.env!.API_KEY);
        expect(json.env.DATABASE_URL).toBe(serverWithSecrets.env!.DATABASE_URL);
      }
    });

    it('should expose real secrets in list endpoint with secrets=true', async () => {
      mocks.mockListServers.mockReturnValue([serverWithSecrets]);

      const response = await createTestRequest(app, 'GET', '/api/servers?secrets=true');
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json[0].env?.API_KEY).toBe(serverWithSecrets.env!.API_KEY);
    });

    it('should still redact by default without secrets=true', async () => {
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'GET', '/api/servers/server-with-secrets');
      const json = await response.json();

      // Default behavior: secrets are redacted
      if (json.env) {
        expect(json.env.API_KEY).not.toBe(serverWithSecrets.env!.API_KEY);
      }
    });

    it('should NOT expose real secrets in update response even with secrets=true', async () => {
      // Note: This is a security trade-off test.
      // Some products may choose to NEVER return secrets in API responses,
      // even with opt-in flags, to minimize exposure.
      mocks.mockGetServer.mockReturnValue(serverWithSecrets);

      const response = await createTestRequest(app, 'POST', '/api/servers/server-with-secrets/update?secrets=true', {
        body: {
          name: 'api-server',
          transport: 'stdio',
          command: 'node',
        },
      });

      const json = await response.json();
      // This test currently expects secrets to be redacted even with opt-in
      expect(JSON.stringify(json)).not.toContain('super-secret-key-12345');
    });
  });
});

describe('Security - CORS Configuration', () => {
  const createCorsRequest = async (
    method: string,
    origin: string
  ): Promise<Response> => {
    const url = new URL('http://localhost:3000/api/servers', 'http://localhost');
    const request = new Request(url, {
      method,
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
      },
    });
    return app.fetch(request);
  };

  it('should NOT allow wildcard origin', async () => {
    mocks.mockListServers.mockReturnValue([]);

    // Create a preflight request
    const preflightUrl = new URL('http://localhost:3000/api/servers', 'http://localhost');
    const preflightRequest = new Request(preflightUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://evil.com',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const response = await app.fetch(preflightRequest);
    const corsHeader = response.headers.get('Access-Control-Allow-Origin');

    // Wildcard should NEVER be allowed for API endpoints
    expect(corsHeader).not.toBe('*');
  });

  it('should allow same-origin requests', async () => {
    mocks.mockListServers.mockReturnValue([]);

    const response = await createCorsRequest('GET', 'http://localhost:3000');
    // Same-origin should work (no CORS header needed, or origin match)
    expect(response.status).toBe(200);
  });

  it('should allow localhost in development', async () => {
    mocks.mockListServers.mockReturnValue([]);

    const localhostOrigins = [
      'http://localhost',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://127.0.0.1:3000',
    ];

    for (const origin of localhostOrigins) {
      const response = await createCorsRequest('GET', origin);
      const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');

      // Localhost should be allowed
      expect([origin, 'http://localhost', 'http://127.0.0.1']).toContain(allowedOrigin);
    }
  });

  it('should allow the dashboard origin when running on different port', async () => {
    mocks.mockListServers.mockReturnValue([]);

    // Common dashboard port scenario
    const dashboardOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:8080',
    ];

    for (const origin of dashboardOrigins) {
      const response = await createCorsRequest('GET', origin);
      const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');

      // These localhost variants should be allowed
      expect(allowedOrigin).toBeTruthy();
      expect(allowedOrigin).not.toBe('*');
    }
  });

  it('should reject arbitrary external origins', async () => {
    mocks.mockListServers.mockReturnValue([]);

    const evilOrigins = [
      'http://evil.com',
      'https://attacker.example.com',
      'https://mcp-hacker.io',
    ];

    for (const origin of evilOrigins) {
      const response = await createCorsRequest('GET', origin);
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');

      // Arbitrary external origins should NOT be allowed
      expect(corsHeader).not.toBe(origin);
      expect(corsHeader).not.toBe('*');
    }
  });

  it('should include appropriate CORS headers when allowed', async () => {
    mocks.mockListServers.mockReturnValue([]);

    const response = await createCorsRequest('GET', 'http://localhost:3001');

    // If origin is allowed, common CORS headers should be present
    const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
    if (allowedOrigin && allowedOrigin !== '*') {
      // Check for common CORS headers
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeTruthy();
    }
  });

  it('should handle preflight requests properly', async () => {
    mocks.mockListServers.mockReturnValue([]);

    // OPTIONS request with preflight headers
    const preflightUrl = new URL('http://localhost:3000/api/servers', 'http://localhost');
    const preflightRequest = new Request(preflightUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    const response = await app.fetch(preflightRequest);

    // Preflight should get CORS headers
    const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
    expect(allowedOrigin).not.toBe('*');

    // Should indicate which methods are allowed
    const allowedMethods = response.headers.get('Access-Control-Allow-Methods');
    if (allowedMethods) {
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('GET');
    }
  });

  it('should NOT expose CORS Allow-Origin with wildcard for credentials requests', async () => {
    mocks.mockListServers.mockReturnValue([]);

    // Even if origin is technically allowed, wildcard + credentials is forbidden
    const preflightUrl = new URL('http://localhost:3000/api/servers', 'http://localhost');
    const preflightRequest = new Request(preflightUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Credentials': 'true',
      },
    });

    const response = await app.fetch(preflightRequest);
    const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
    const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');

    // If credentials are allowed, origin cannot be wildcard
    if (allowCredentials === 'true') {
      expect(allowedOrigin).not.toBe('*');
    }
  });
});

describe('Security - Response Shape Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include env field but with redacted values (not missing)', async () => {
    const serverWithEnv = {
      id: 'test-server',
      name: 'test',
      transport: 'stdio' as const,
      command: 'node',
      env: { SECRET: 'real-value' },
      enabled: true,
    };
    mocks.mockGetServer.mockReturnValue(serverWithEnv);

    const response = await createTestRequest(app, 'GET', '/api/servers/test-server');
    const json = await response.json();

    // env field should exist (not undefined/null) but be redacted
    expect(json).toHaveProperty('env');
    // If env is an object with keys, those keys should be present but values masked
    if (json.env && typeof json.env === 'object') {
      expect(Object.keys(json.env)).toContain('SECRET');
      expect(json.env.SECRET).not.toBe('real-value');
    }
  });

  it('should handle servers without env field gracefully', async () => {
    const serverWithoutEnv = {
      id: 'no-env-server',
      name: 'no-env',
      transport: 'stdio' as const,
      command: 'node',
      env: undefined,
      enabled: true,
    };
    mocks.mockListServers.mockReturnValue([serverWithoutEnv]);

    const response = await createTestRequest(app, 'GET', '/api/servers');
    const json = await response.json();

    // Should handle undefined env without error
    expect(response.status).toBe(200);
    expect(json[0].env).toBeUndefined();
  });

  it('should redact env regardless of transport type', async () => {
    const remoteServer = {
      id: 'remote-server',
      name: 'remote',
      transport: 'sse' as const,
      url: 'https://api.example.com',
      env: { API_TOKEN: 'sk-abc123secret' },
      enabled: true,
    };
    mocks.mockGetServer.mockReturnValue(remoteServer);

    const response = await createTestRequest(app, 'GET', '/api/servers/remote-server');
    const json = await response.json();

    expect(JSON.stringify(json)).not.toContain('sk-abc123secret');
  });
});

describe('Security - Project endpoints', () => {
  const projectServer = {
    id: 'project-server',
    name: 'project-api',
    transport: 'stdio' as const,
    command: 'node',
    env: { API_KEY: 'project-secret' },
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetProject.mockReturnValue({
      id: 'project-1',
      name: 'alpha',
      description: 'demo',
    });
    mocks.mockGetProjectServers.mockReturnValue([projectServer]);
    mocks.mockGetProjectTools.mockReturnValue([]);
    mocks.mockListServers.mockReturnValue([projectServer]);
  });

  it('should redact secrets in GET /api/projects/:id/servers', async () => {
    const response = await createTestRequest(app, 'GET', '/api/projects/project-1/servers');
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(json)).not.toContain('project-secret');
  });

  it('should redact secrets in GET /api/projects/:id/full', async () => {
    const response = await createTestRequest(app, 'GET', '/api/projects/project-1/full');
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(json)).not.toContain('project-secret');
  });
});
