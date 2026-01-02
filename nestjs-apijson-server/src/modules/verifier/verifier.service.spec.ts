import { Test, TestingModule } from '@nestjs/testing';
import { VerifierService } from './verifier.service';
import { CacheService } from '../cache/cache.service';
import { RequestMethod } from '@/types/request-method.type';

/**
 * 验证器服务单元测试
 */
describe('VerifierService', () => {
  let service: VerifierService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifierService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VerifierService>(VerifierService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyRequest', () => {
    it('should verify valid request', () => {
      const request = {
        User: {
          id: 1,
        },
      };

      const result = service.verifyRequest(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty request', () => {
      const request = {};

      const result = service.verifyRequest(request, RequestMethod.GET);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject null request', () => {
      const request = null;

      const result = service.verifyRequest(request, RequestMethod.GET);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should verify POST request with data', () => {
      const request = {
        User: {
          name: '张三',
          age: 25,
        },
      };

      const result = service.verifyRequest(request, RequestMethod.POST);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should verify PUT request with id and data', () => {
      const request = {
        User: {
          id: 1,
          name: '李四',
        },
      };

      const result = service.verifyRequest(request, RequestMethod.PUT);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject PUT request without id', () => {
      const request = {
        User: {
          name: '李四',
        },
      };

      const result = service.verifyRequest(request, RequestMethod.PUT);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should verify DELETE request with id', () => {
      const request = {
        User: {
          id: 1,
        },
      };

      const result = service.verifyRequest(request, RequestMethod.DELETE);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject DELETE request without id', () => {
      const request = {
        User: {
          name: '张三',
        },
      };

      const result = service.verifyRequest(request, RequestMethod.DELETE);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should verify CRUD request with multiple operations', () => {
      const request = {
        User: {
          id: 1,
          name: '王五',
        },
        'Comment[]': {
          userId: 1,
        },
      };

      const result = service.verifyRequest(request, RequestMethod.CRUD);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('verifyTableName', () => {
    it('should accept valid table name', () => {
      const tableName = 'User';
      const result = service['verifyTableName'](tableName);

      expect(result).toBe(true);
    });

    it('should accept table name with underscore', () => {
      const tableName = 'sys_User';
      const result = service['verifyTableName'](tableName);

      expect(result).toBe(true);
    });

    it('should reject empty table name', () => {
      const tableName = '';
      const result = service['verifyTableName'](tableName);

      expect(result).toBe(false);
    });

    it('should reject table name with special characters', () => {
      const tableName = 'User-Test';
      const result = service['verifyTableName'](tableName);

      expect(result).toBe(false);
    });

    it('should reject table name starting with number', () => {
      const tableName = '1User';
      const result = service['verifyTableName'](tableName);

      expect(result).toBe(false);
    });
  });

  describe('verifyColumnName', () => {
    it('should accept valid column name', () => {
      const columnName = 'id';
      const result = service['verifyColumnName'](columnName);

      expect(result).toBe(true);
    });

    it('should accept column name with underscore', () => {
      const columnName = 'user_id';
      const result = service['verifyColumnName'](columnName);

      expect(result).toBe(true);
    });

    it('should reject empty column name', () => {
      const columnName = '';
      const result = service['verifyColumnName'](columnName);

      expect(result).toBe(false);
    });

    it('should reject column name with special characters', () => {
      const columnName = 'user-id';
      const result = service['verifyColumnName'](columnName);

      expect(result).toBe(false);
    });

    it('should reject column name starting with number', () => {
      const columnName = '1id';
      const result = service['verifyColumnName'](columnName);

      expect(result).toBe(false);
    });
  });

  describe('verifyWhere', () => {
    it('should accept valid WHERE condition', () => {
      const where = { id: 1 };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept WHERE with operators', () => {
      const where = { id: { '>=': 1 } };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept WHERE with IN operator', () => {
      const where = { id: { '{}': [1, 2, 3] } };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept WHERE with LIKE operator', () => {
      const where = { name: { '~': '张' } };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept WHERE with logical operators', () => {
      const where = {
        $and: [
          { id: 1 },
          { name: '张三' },
        ],
      };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject WHERE with invalid column name', () => {
      const where = { 'user-id': 1 };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject WHERE with invalid operator', () => {
      const where = { id: { 'invalid': 1 } };
      const result = service['verifyWhere'](where);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('verifyData', () => {
    it('should accept valid data', () => {
      const data = { name: '张三', age: 25 };
      const result = service['verifyData'](data);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty data', () => {
      const data = {};
      const result = service['verifyData'](data);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject data with invalid column name', () => {
      const data = { 'user-name': '张三' };
      const result = service['verifyData'](data);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('verifyUserPermission', () => {
    it('should verify user permission from cache', async () => {
      const userId = 'user123';
      const tableName = 'User';
      const operation = 'SELECT';
      const permission = { canSelect: true };

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(permission));

      const result = await service.verifyUserPermission(userId, tableName, operation);

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(`permission:${userId}:${tableName}`);
    });

    it('should return false when permission not found', async () => {
      const userId = 'user123';
      const tableName = 'User';
      const operation = 'SELECT';

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.verifyUserPermission(userId, tableName, operation);

      expect(result).toBe(false);
    });

    it('should return false when permission denies operation', async () => {
      const userId = 'user123';
      const tableName = 'User';
      const operation = 'DELETE';
      const permission = { canSelect: true, canDelete: false };

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(permission));

      const result = await service.verifyUserPermission(userId, tableName, operation);

      expect(result).toBe(false);
    });
  });

  describe('verifyUserRole', () => {
    it('should verify user role from cache', async () => {
      const userId = 'user123';
      const role = 'ADMIN';
      const userRoles = ['ADMIN', 'USER'];

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(userRoles));

      const result = await service.verifyUserRole(userId, role);

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(`roles:${userId}`);
    });

    it('should return false when role not found', async () => {
      const userId = 'user123';
      const role = 'ADMIN';
      const userRoles = ['USER'];

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(userRoles));

      const result = await service.verifyUserRole(userId, role);

      expect(result).toBe(false);
    });

    it('should return false when roles not found', async () => {
      const userId = 'user123';
      const role = 'ADMIN';

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.verifyUserRole(userId, role);

      expect(result).toBe(false);
    });
  });

  describe('collectErrors', () => {
    it('should collect errors', () => {
      const errors = [
        { field: 'User.id', message: 'id 不能为空' },
        { field: 'User.name', message: 'name 格式不正确' },
      ];

      const result = service['collectErrors'](errors);

      expect(result).toEqual(errors);
    });

    it('should collect warnings', () => {
      const warnings = [
        { field: 'User.age', message: 'age 可能超出范围' },
      ];

      const result = service['collectWarnings'](warnings);

      expect(result).toEqual(warnings);
    });
  });
});
