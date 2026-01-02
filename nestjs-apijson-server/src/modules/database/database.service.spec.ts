import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import mysql from 'mysql2/promise';
import { vi } from 'vitest';

// Mock mysql2/promise
vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockConfigService: ConfigService;
  let mockPool: any;

  const mockDatabaseConfig = {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_db',
    connectionLimit: 10,
  };

  const mockPostgresConfig = {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'test_db',
  };

  const mockSQLiteConfig = {
    type: 'sqlite',
    database: './test.db',
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock pool
    mockPool = {
      query: vi.fn(),
      getConnection: vi.fn(),
      end: vi.fn(),
    };

    // Mock mysql2 createPool
    (mysql.createPool as any).mockReturnValue(mockPool);

    // Create mock ConfigService
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'database') {
          return mockDatabaseConfig;
        }
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    
    // Initialize service
    await service.onModuleInit();
  });

  afterEach(async () => {
    if (service) {
      await service.close();
    }
  });

  describe('初始化', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 3306,
          user: 'root',
          password: 'password',
          database: 'test_db',
          connectionLimit: 10,
        })
      );
    });

    it('应该支持PostgreSQL配置', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();
      expect(postgresService).toBeDefined();
      await postgresService.close();
    });

    it('应该支持SQLite配置', async () => {
      const sqliteMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockSQLiteConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: sqliteMockConfigService,
          },
        ],
      }).compile();

      const sqliteService = module.get<DatabaseService>(DatabaseService);
      await sqliteService.onModuleInit();
      expect(sqliteService).toBeDefined();
      await sqliteService.close();
    });

    it('应该拒绝不支持的数据库类型', async () => {
      const invalidMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return { type: 'mongodb' };
          }
          return undefined;
        }),
      } as any;

      await expect(
        Test.createTestingModule({
          providers: [
            DatabaseService,
            {
              provide: ConfigService,
              useValue: invalidMockConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('不支持的数据库类型: mongodb');
    });
  });

  describe('query - MySQL', () => {
    it('应该成功执行MySQL查询', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      const mockFields = [{ name: 'id' }, { name: 'name' }];
      mockPool.query.mockResolvedValue([mockRows, mockFields]);

      const result = await service.query('SELECT * FROM users WHERE id = ?', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
      expect(result.rows).toEqual(mockRows);
      expect(result.rowCount).toBe(1);
      expect(result.fields).toEqual(mockFields);
    });

    it('应该处理空结果集', async () => {
      mockPool.query.mockResolvedValue([[], []]);

      const result = await service.query('SELECT * FROM users WHERE id = ?', [999]);

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('应该处理查询错误', async () => {
      const error = new Error('SQL syntax error');
      mockPool.query.mockRejectedValue(error);

      await expect(service.query('INVALID SQL')).rejects.toThrow('SQL syntax error');
    });

    it('应该支持无参数查询', async () => {
      mockPool.query.mockResolvedValue([[{ count: 5 }], []]);

      const result = await service.query('SELECT COUNT(*) as count FROM users');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users', []);
      expect(result.rows[0].count).toBe(5);
    });
  });

  describe('query - PostgreSQL', () => {
    it('应该返回模拟的PostgreSQL查询结果', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();
      const result = await postgresService.query('SELECT * FROM users');

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      await postgresService.close();
    });
  });

  describe('query - SQLite', () => {
    it('应该返回模拟的SQLite查询结果', async () => {
      const sqliteMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockSQLiteConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: sqliteMockConfigService,
          },
        ],
      }).compile();

      const sqliteService = module.get<DatabaseService>(DatabaseService);
      await sqliteService.onModuleInit();
      const result = await sqliteService.query('SELECT * FROM users');

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      await sqliteService.close();
    });
  });

  describe('getTableSchema - MySQL', () => {
    it('应该成功获取MySQL表结构', async () => {
      const mockColumns = [
        {
          columnName: 'id',
          dataType: 'int',
          columnType: 'int(11)',
          isNullable: 'NO',
          columnKey: 'PRI',
          columnDefault: null,
          extra: 'auto_increment',
          columnComment: '主键ID',
        },
        {
          columnName: 'name',
          dataType: 'varchar',
          columnType: 'varchar(255)',
          isNullable: 'YES',
          columnKey: '',
          columnDefault: null,
          extra: '',
          columnComment: '用户名',
        },
      ];

      const mockIndexes = [
        { indexName: 'PRIMARY', columnName: 'id', nonUnique: 0, seqInIndex: 1 },
        { indexName: 'idx_name', columnName: 'name', nonUnique: 1, seqInIndex: 1 },
      ];

      const mockForeignKeys = [
        {
          constraintName: 'fk_user_role',
          columnName: 'roleId',
          referencedTable: 'roles',
          referencedColumn: 'id',
        },
      ];

      const mockTableComment = [{ comment: '用户表' }];

      mockPool.query
        .mockResolvedValueOnce([mockColumns, []])
        .mockResolvedValueOnce([mockIndexes, []])
        .mockResolvedValueOnce([mockForeignKeys, []])
        .mockResolvedValueOnce([mockTableComment, []]);

      const schema = await service.getTableSchema('users');

      expect(schema.tableName).toBe('users');
      expect(schema.comment).toBe('用户表');
      expect(schema.columns).toHaveLength(2);
      expect(schema.columns[0]).toEqual({
        name: 'id',
        type: 'int',
        fullType: 'int(11)',
        nullable: false,
        primaryKey: true,
        autoIncrement: true,
        default: null,
        comment: '主键ID',
      });
      expect(schema.columns[1]).toEqual({
        name: 'name',
        type: 'varchar',
        fullType: 'varchar(255)',
        nullable: true,
        primaryKey: false,
        autoIncrement: false,
        default: null,
        comment: '用户名',
      });
      expect(schema.indexes).toHaveLength(2);
      expect(schema.indexes[0].name).toBe('PRIMARY');
      expect(schema.indexes[0].primary).toBe(true);
      expect(schema.foreignKeys).toHaveLength(1);
      expect(schema.foreignKeys[0].constraintName).toBe('fk_user_role');
    });

    it('应该处理空表结构', async () => {
      mockPool.query
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []]);

      const schema = await service.getTableSchema('empty_table');

      expect(schema.tableName).toBe('empty_table');
      expect(schema.columns).toEqual([]);
      expect(schema.indexes).toEqual([]);
      expect(schema.foreignKeys).toEqual([]);
    });

    it('应该处理表结构查询错误', async () => {
      mockPool.query.mockRejectedValue(new Error('Table not found'));

      await expect(service.getTableSchema('nonexistent')).rejects.toThrow('Table not found');
    });
  });

  describe('getTables - MySQL', () => {
    it('应该成功获取MySQL所有表', async () => {
      const mockTables = [
        { tableName: 'users' },
        { tableName: 'roles' },
        { tableName: 'permissions' },
      ];

      mockPool.query.mockResolvedValueOnce([mockTables, []]);

      const tables = await service.getTables();

      expect(tables).toEqual(['users', 'roles', 'permissions']);
    });

    it('应该处理空表列表', async () => {
      mockPool.query.mockResolvedValueOnce([[], []]);

      const tables = await service.getTables();

      expect(tables).toEqual([]);
    });

    it('应该处理获取表列表错误', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection error'));

      await expect(service.getTables()).rejects.toThrow('Connection error');
    });
  });

  describe('testConnection', () => {
    it('应该成功测试MySQL连接', async () => {
      const mockConnection = {
        ping: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      };
      mockPool.getConnection.mockResolvedValue(mockConnection);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.ping).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该处理连接测试失败', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('应该处理ping失败', async () => {
      const mockConnection = {
        ping: vi.fn().mockRejectedValue(new Error('Ping failed')),
        release: vi.fn(),
      };
      mockPool.getConnection.mockResolvedValue(mockConnection);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('PostgreSQL应该返回模拟连接测试', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();
      const result = await postgresService.testConnection();

      expect(result).toBe(true);
      await postgresService.close();
    });
  });

  describe('getDatabaseVersion', () => {
    it('应该成功获取MySQL版本', async () => {
      mockPool.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);

      const version = await service.getDatabaseVersion();

      expect(version).toBe('8.0.32');
    });

    it('应该处理版本查询失败', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      const version = await service.getDatabaseVersion();

      expect(version).toBe('unknown');
    });

    it('PostgreSQL应该返回模拟版本', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();
      const version = await postgresService.getDatabaseVersion();

      expect(version).toBe('PostgreSQL (模拟)');
      await postgresService.close();
    });
  });

  describe('getDatabaseSize', () => {
    it('应该成功获取MySQL数据库大小', async () => {
      mockPool.query.mockResolvedValueOnce([[{ database: 'test_db', size: 10.5 }], []]);

      const size = await service.getDatabaseSize();

      expect(size.database).toBe('test_db');
      expect(size.size).toBe(10.5);
      expect(size.unit).toBe('MB');
    });

    it('应该处理空数据库大小', async () => {
      mockPool.query.mockResolvedValueOnce([[], []]);

      const size = await service.getDatabaseSize();

      expect(size.database).toBe('test_db');
      expect(size.size).toBe(0);
      expect(size.unit).toBe('MB');
    });

    it('应该处理数据库大小查询失败', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      const size = await service.getDatabaseSize();

      expect(size.database).toBe('test_db');
      expect(size.size).toBe(0);
      expect(size.unit).toBe('MB');
    });
  });

  describe('executeTransaction', () => {
    it('应该成功执行MySQL事务', async () => {
      const mockConnection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        query: vi.fn()
          .mockResolvedValueOnce([[{ id: 1 }], []])
          .mockResolvedValueOnce([[{ id: 2 }], []]),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      };
      mockPool.getConnection.mockResolvedValue(mockConnection);

      const queries = [
        { sql: 'INSERT INTO users SET ?', params: [{ name: 'Alice' }] },
        { sql: 'INSERT INTO users SET ?', params: [{ name: 'Bob' }] },
      ];

      const results = await service.executeTransaction(queries);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it('应该回滚失败的事务', async () => {
      const mockConnection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        query: vi.fn()
          .mockResolvedValueOnce([[{ id: 1 }], []])
          .mockRejectedValue(new Error('Insert failed')),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      };
      mockPool.getConnection.mockResolvedValue(mockConnection);

      const queries = [
        { sql: 'INSERT INTO users SET ?', params: [{ name: 'Alice' }] },
        { sql: 'INSERT INTO users SET ?', params: [{ name: 'Bob' }] },
      ];

      await expect(service.executeTransaction(queries)).rejects.toThrow('Insert failed');

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('应该拒绝非MySQL数据库的事务请求', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();

      await expect(postgresService.executeTransaction([])).rejects.toThrow('事务功能仅支持MySQL');
      await postgresService.close();
    });

    it('应该处理获取连接失败', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(service.executeTransaction([])).rejects.toThrow('Connection failed');
    });
  });

  describe('close', () => {
    it('应该成功关闭MySQL连接', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await service.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('应该处理关闭连接失败', async () => {
      mockPool.end.mockRejectedValue(new Error('Close failed'));

      await expect(service.close()).rejects.toThrow('Close failed');
    });

    it('应该成功关闭PostgreSQL连接', async () => {
      const postgresMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockPostgresConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: postgresMockConfigService,
          },
        ],
      }).compile();

      const postgresService = module.get<DatabaseService>(DatabaseService);
      await postgresService.onModuleInit();
      await expect(postgresService.close()).resolves.not.toThrow();
    });

    it('应该成功关闭SQLite连接', async () => {
      const sqliteMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return mockSQLiteConfig;
          }
          return undefined;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: sqliteMockConfigService,
          },
        ],
      }).compile();

      const sqliteService = module.get<DatabaseService>(DatabaseService);
      await sqliteService.onModuleInit();
      await expect(sqliteService.close()).resolves.not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该拒绝不支持的数据库类型查询', async () => {
      const invalidMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return { type: 'mongodb' };
          }
          return undefined;
        }),
      } as any;

      await expect(
        Test.createTestingModule({
          providers: [
            DatabaseService,
            {
              provide: ConfigService,
              useValue: invalidMockConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('不支持的数据库类型: mongodb');
    });

    it('应该拒绝不支持的数据库类型获取表结构', async () => {
      const invalidMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return { type: 'mongodb' };
          }
          return undefined;
        }),
      } as any;

      await expect(
        Test.createTestingModule({
          providers: [
            DatabaseService,
            {
              provide: ConfigService,
              useValue: invalidMockConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('不支持的数据库类型: mongodb');
    });

    it('应该拒绝不支持的数据库类型获取表列表', async () => {
      const invalidMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return { type: 'mongodb' };
          }
          return undefined;
        }),
      } as any;

      await expect(
        Test.createTestingModule({
          providers: [
            DatabaseService,
            {
              provide: ConfigService,
              useValue: invalidMockConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('不支持的数据库类型: mongodb');
    });

    it('应该拒绝不支持的数据库类型关闭连接', async () => {
      const invalidMockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'database') {
            return { type: 'mongodb' };
          }
          return undefined;
        }),
      } as any;

      await expect(
        Test.createTestingModule({
          providers: [
            DatabaseService,
            {
              provide: ConfigService,
              useValue: invalidMockConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('不支持的数据库类型: mongodb');
    });
  });

  describe('onModuleDestroy', () => {
    it('应该在模块销毁时关闭连接', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
