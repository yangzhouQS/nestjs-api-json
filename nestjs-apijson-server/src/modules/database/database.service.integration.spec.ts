import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { testDbHelper } from '@/test/database/test-db-helper';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

/**
 * DatabaseService 集成测试
 * 使用真实的MySQL数据库进行测试
 * 
 * 运行方式：
 * USE_REAL_DATABASE=true npm run test -- database.service.integration.spec.ts
 */
describe('DatabaseService - Integration Tests with Real MySQL', () => {
  let service: DatabaseService;
  let configService: ConfigService;

  beforeAll(async () => {
    // 跳过测试如果未启用真实数据库
    if (!process.env.USE_REAL_DATABASE) {
      console.log('⚠️  跳过集成测试：未启用真实数据库');
      return;
    }

    // 确保测试数据库已初始化
    await testDbHelper.initialize();

    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                database: {
                  type: 'mysql',
                  host: process.env.DB_HOST || 'localhost',
                  port: parseInt(process.env.DB_PORT || '3306', 10),
                  user: process.env.DB_USERNAME || 'root',
                  password: process.env.DB_PASSWORD || '',
                  database: process.env.DB_DATABASE || 'apijson_test',
                  connectionLimit: 5,
                },
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);

    // 初始化服务
    await service.onModuleInit();
  });

  afterAll(async () => {
    if (service) {
      await service.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    if (process.env.USE_REAL_DATABASE) {
      await testDbHelper.cleanupData();
    }
  });

  describe('数据库连接', () => {
    it('应该成功连接到测试数据库', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const isConnected = await service.testConnection();
      expect(isConnected).toBe(true);
    });

    it('应该获取数据库版本信息', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const version = await service.getDatabaseVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).not.toBe('unknown');
    });

    it('应该获取数据库大小信息', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const size = await service.getDatabaseSize();
      expect(size).toBeDefined();
      expect(size.database).toBe('apijson_test');
      expect(typeof size.size).toBe('number');
      expect(size.unit).toBe('MB');
    });
  });

  describe('查询操作', () => {
    it('应该成功执行SELECT查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query('SELECT * FROM users');
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.rowCount).toBe(5); // 初始化数据中有5个用户
    });

    it('应该支持带参数的查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Alice');
    });

    it('应该支持聚合函数查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query('SELECT COUNT(*) as count FROM users');
      expect(result.rows[0].count).toBe(5);
    });

    it('应该支持JOIN查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(`
        SELECT u.*, r.name as role_name
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = 1
      `);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].role_name).toBe('user');
    });

    it('应该支持GROUP BY查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(`
        SELECT u.id, u.name, COUNT(m.id) as moment_count
        FROM users u
        LEFT JOIN moments m ON u.id = m.user_id
        GROUP BY u.id, u.name
      `);
      expect(result.rows.length).toBe(5);
    });

    it('应该处理空结果集', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query('SELECT * FROM users WHERE id = ?', [999]);
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('应该抛出SQL语法错误', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      await expect(service.query('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('表结构操作', () => {
    it('应该获取所有表', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const tables = await service.getTables();
      expect(tables).toBeDefined();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables).toContain('users');
      expect(tables).toContain('roles');
      expect(tables).toContain('moments');
      expect(tables).toContain('comments');
    });

    it('应该获取users表结构', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const schema = await service.getTableSchema('users');
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('users');
      expect(schema.columns).toBeDefined();
      expect(Array.isArray(schema.columns)).toBe(true);
      expect(schema.columns.length).toBeGreaterThan(0);

      // 检查id列
      const idColumn = schema.columns.find((col: any) => col.name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn.primaryKey).toBe(true);
      expect(idColumn.autoIncrement).toBe(true);

      // 检查name列
      const nameColumn = schema.columns.find((col: any) => col.name === 'name');
      expect(nameColumn).toBeDefined();
      expect(nameColumn.type).toBe('varchar');
    });

    it('应该获取roles表结构', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const schema = await service.getTableSchema('roles');
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('roles');
      expect(schema.columns.length).toBeGreaterThan(0);
    });

    it('应该获取索引信息', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const schema = await service.getTableSchema('users');
      expect(schema.indexes).toBeDefined();
      expect(Array.isArray(schema.indexes)).toBe(true);

      // 检查主键索引
      const primaryKey = schema.indexes.find((idx: any) => idx.primary);
      expect(primaryKey).toBeDefined();
      expect(primaryKey.name).toBe('PRIMARY');
    });
  });

  describe('事务操作', () => {
    it('应该成功执行事务', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const queries = [
        { sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)', params: ['Test User', 'test@example.com', 30] },
        { sql: 'INSERT INTO moments (user_id, content) VALUES (?, ?)', params: [6, 'Test moment'] },
      ];

      const results = await service.executeTransaction(queries);
      expect(results).toHaveLength(2);
      expect(results[0].affectedRows).toBe(1);
      expect(results[1].affectedRows).toBe(1);

      // 验证数据已插入
      const userResult = await service.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].name).toBe('Test User');
    });

    it('应该回滚失败的事务', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const queries = [
        { sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)', params: ['Test User 2', 'test2@example.com', 30] },
        { sql: 'INVALID SQL', params: [] }, // 这个会失败
      ];

      await expect(service.executeTransaction(queries)).rejects.toThrow();

      // 验证数据未被插入
      const userResult = await service.query('SELECT * FROM users WHERE email = ?', ['test2@example.com']);
      expect(userResult.rows).toHaveLength(0);
    });

    it('应该支持复杂的事务操作', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const queries = [
        { sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)', params: ['Transaction User', 'trans@example.com', 25] },
        { sql: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', params: [6, 2] },
        { sql: 'INSERT INTO moments (user_id, content) VALUES (?, ?)', params: [6, 'Transaction moment'] },
        { sql: 'INSERT INTO comments (user_id, content, moment_id) VALUES (?, ?, ?)', params: [6, 'Transaction comment', 6] },
      ];

      const results = await service.executeTransaction(queries);
      expect(results).toHaveLength(4);

      // 验证所有数据都已插入
      const userResult = await service.query('SELECT * FROM users WHERE email = ?', ['trans@example.com']);
      expect(userResult.rows).toHaveLength(1);

      const roleResult = await service.query('SELECT * FROM user_roles WHERE user_id = ?', [6]);
      expect(roleResult.rows).toHaveLength(1);

      const momentResult = await service.query('SELECT * FROM moments WHERE user_id = ?', [6]);
      expect(momentResult.rows).toHaveLength(1);

      const commentResult = await service.query('SELECT * FROM comments WHERE user_id = ?', [6]);
      expect(commentResult.rows).toHaveLength(1);
    });
  });

  describe('数据操作', () => {
    it('应该支持INSERT操作', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['New User', 'new@example.com', 28]
      );
      expect(result.affectedRows).toBe(1);
      expect(result.insertId).toBeGreaterThan(0);

      // 验证数据
      const userResult = await service.query('SELECT * FROM users WHERE email = ?', ['new@example.com']);
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].name).toBe('New User');
    });

    it('应该支持UPDATE操作', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(
        'UPDATE users SET age = ? WHERE id = ?',
        [26, 1]
      );
      expect(result.affectedRows).toBe(1);

      // 验证数据
      const userResult = await service.query('SELECT * FROM users WHERE id = ?', [1]);
      expect(userResult.rows[0].age).toBe(26);
    });

    it('应该支持DELETE操作', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      // 先插入一条数据
      await service.query(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['Delete Me', 'delete@example.com', 30]
      );

      // 删除数据
      const result = await service.query(
        'DELETE FROM users WHERE email = ?',
        ['delete@example.com']
      );
      expect(result.affectedRows).toBe(1);

      // 验证数据已删除
      const userResult = await service.query('SELECT * FROM users WHERE email = ?', ['delete@example.com']);
      expect(userResult.rows).toHaveLength(0);
    });

    it('应该支持批量INSERT', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
        ['User 1', 'user1@example.com', 25, 'User 2', 'user2@example.com', 26, 'User 3', 'user3@example.com', 27]
      );
      expect(result.affectedRows).toBe(3);
      expect(result.insertId).toBeGreaterThan(0);
    });
  });

  describe('复杂查询', () => {
    it('应该支持子查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(`
        SELECT * FROM users
        WHERE id IN (SELECT user_id FROM user_roles WHERE role_id = 1)
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('应该支持UNION查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(`
        SELECT name, email FROM users WHERE age < 28
        UNION
        SELECT name, email FROM users WHERE age > 30
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('应该支持LIMIT和OFFSET', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query('SELECT * FROM users LIMIT 2 OFFSET 1');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe(2);
    });

    it('应该支持ORDER BY', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query('SELECT * FROM users ORDER BY age DESC');
      expect(result.rows[0].age).toBeGreaterThanOrEqual(result.rows[1].age);
    });

    it('应该支持HAVING', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const result = await service.query(`
        SELECT user_id, COUNT(*) as comment_count
        FROM comments
        GROUP BY user_id
        HAVING comment_count > 1
      `);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成查询', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      const startTime = Date.now();
      await service.query('SELECT * FROM users');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该支持连接池', async () => {
      if (!process.env.USE_REAL_DATABASE) {
        return;
      }

      // 并发执行多个查询
      const queries = Array(10).fill(null).map(() => 
        service.query('SELECT * FROM users LIMIT 1')
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.rows.length).toBeGreaterThan(0);
      });
    });
  });
});
