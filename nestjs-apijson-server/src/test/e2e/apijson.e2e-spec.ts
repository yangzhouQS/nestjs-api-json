import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { APIJSONController } from '@/controllers/apijson.controller';
import { CacheService } from '@/modules/cache/cache.service';
import { DatabaseService } from '@/modules/database/database.service';
import * as request from 'supertest';

describe('APIJSON E2E Tests', () => {
  let app: INestApplication;
  let testingModule: TestingModule;
  let cacheService: CacheService;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    // Mock DatabaseService to avoid real database connection
    const mockDatabaseService = {
      provide: DatabaseService,
      useValue: {
        query: vi.fn(async (sql: string, params: any[]) => {
          // Mock query results
          if (sql.includes('User')) {
            return {
              rows: [
                { id: 1, name: 'John Doe', email: 'john@example.com' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
              ],
              rowCount: 2,
            };
          }
          return { rows: [], rowCount: 0 };
        }),
        getTableSchema: vi.fn(),
        getTables: vi.fn(),
        close: vi.fn(),
      },
    };

    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService.useValue)
      .compile();

    app = testingModule.createNestApplication();
    await app.init();

    cacheService = testingModule.get<CacheService>(CacheService);
    databaseService = testingModule.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.flush();
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('POST /api/apijson', () => {
    it('should handle simple query request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name', 'email'],
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/api/apijson');
      expect(response.body).toHaveProperty('cached', false);
      expect(response.body.data).toHaveProperty('User');
      expect(response.body.data.User).toHaveProperty('data');
      expect(Array.isArray(response.body.data.User.data)).toBe(true);
    });

    it('should handle query with where condition', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name'],
            where: { id: 1 },
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.User.data).toBeDefined();
    });

    it('should handle query with order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name'],
            order: ['name+'],
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle query with limit and offset', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name'],
            limit: 5,
            offset: 0,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle multiple table queries', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name'],
            limit: 10,
          },
          Product: {
            columns: ['id', 'name'],
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('User');
      expect(response.body.data).toHaveProperty('Product');
    });

    it('should handle query with directives', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id', 'name'],
            limit: 10,
          },
          '@method': 'GET',
          '@page': 1,
          '@limit': 10,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should return cached response on second request', async () => {
      const requestBody = {
        User: {
          columns: ['id', 'name'],
          limit: 10,
        },
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/api/apijson')
        .send(requestBody)
        .expect(200);

      expect(response1.body.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await request(app.getHttpServer())
        .post('/api/apijson')
        .send(requestBody)
        .expect(200);

      expect(response2.body.cached).toBe(true);
    });

    it('should handle empty request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({})
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual({});
    });

    it('should return error for invalid table name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          '@InvalidTable': {
            columns: ['id'],
            limit: 10,
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return error for invalid limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: {
            columns: ['id'],
            limit: 1001,
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 400);
    });

    it('should return error for invalid request format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send('invalid string')
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 400);
    });
  });

  describe('GET /api/apijson/info', () => {
    it('should return APIJSON info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/apijson/info')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'APIJSON Server');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('supportedDirectives');
      expect(response.body).toHaveProperty('supportedDatabases');
    });

    it('should return valid features list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/apijson/info')
        .expect(200);

      expect(response.body.features).toContain('完整的 APIJSON 语法支持');
      expect(response.body.features).toContain('强大的查询解析和验证');
      expect(response.body.features).toContain('内置认证和授权');
    });

    it('should return valid supported directives', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/apijson/info')
        .expect(200);

      expect(response.body.supportedDirectives).toContain('@method');
      expect(response.body.supportedDirectives).toContain('@page');
      expect(response.body.supportedDirectives).toContain('@limit');
      expect(response.body.supportedDirectives).toContain('@cache');
    });

    it('should return valid supported databases', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/apijson/info')
        .expect(200);

      expect(response.body.supportedDatabases).toContain('MySQL');
      expect(response.body.supportedDatabases).toContain('PostgreSQL');
      expect(response.body.supportedDatabases).toContain('SQLite');
    });
  });

  describe('GET /api/apijson/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/apijson/stats')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('successfulRequests');
      expect(response.body).toHaveProperty('failedRequests');
      expect(response.body).toHaveProperty('averageProcessingTime');
      expect(response.body).toHaveProperty('lastRequestTime');
      expect(response.body).toHaveProperty('cacheHitRate');
    });
  });

  describe('POST /api/apijson/cache/clear', () => {
    it('should clear cache', async () => {
      // Set some cache
      await cacheService.set('test-key', 'test-value');

      const response = await request(app.getHttpServer())
        .post('/api/apijson/cache/clear')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', '缓存已清空');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .send({
          User: { columns: ['id'] },
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 401);
      expect(response.body).toHaveProperty('message', '未提供认证令牌');
    });

    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 401);
      expect(response.body).toHaveProperty('message', '认证令牌无效');
    });

    it('should accept valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('Rate Limiting', () => {
    it('should set rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Cache Headers', () => {
    it('should set cache miss header on first request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.headers).toHaveProperty('x-cache', 'MISS');
    });

    it('should set cache hit header on cached request', async () => {
      const requestBody = {
        User: { columns: ['id'] },
      };

      // First request
      await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send(requestBody)
        .expect(200);

      // Second request
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send(requestBody)
        .expect(200);

      expect(response.headers).toHaveProperty('x-cache', 'HIT');
    });
  });

  describe('Complex Queries', () => {
    it('should handle query with joins', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            columns: ['id', 'name'],
            joins: [
              { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
            ],
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle query with group by', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            columns: ['id', 'department'],
            group: ['department'],
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle query with having', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            columns: ['id', 'department'],
            group: ['department'],
            having: { count: { $gt: 5 } },
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle query with complex where conditions', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            columns: ['id', 'name'],
            where: {
              $and: [
                { status: 'active' },
                { age: { $gt: 18 } },
              ],
            },
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .set('Content-Type', 'application/json')
        .send('invalid json {')
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 400);
    });

    it('should handle very large request', async () => {
      const largeRequest: any = {};
      for (let i = 0; i < 100; i++) {
        largeRequest[`Table${i}`] = {
          columns: ['id', 'name'],
          limit: 10,
        };
      }

      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send(largeRequest)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle special characters in values', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            where: {
              name: "O'Brien",
              description: 'Test "quoted" string',
            },
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should handle unicode characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: {
            where: {
              name: '你好世界 🌍',
            },
            limit: 10,
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');
    });
  });

  describe('Performance', () => {
    it('should include processing time in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.body).toHaveProperty('processingTime');
      expect(typeof response.body.processingTime).toBe('number');
      expect(response.body.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Response Headers', () => {
    it('should set content-type header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should set security headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/apijson')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          User: { columns: ['id'] },
        })
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});
