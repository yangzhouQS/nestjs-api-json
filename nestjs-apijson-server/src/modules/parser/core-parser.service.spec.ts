import { Test, TestingModule } from '@nestjs/testing';
import { CoreParserService } from './core-parser.service';
import { RequestMethod } from '@/types/request-method.type';

/**
 * 核心解析器服务单元测试
 */
describe('CoreParserService', () => {
  let service: CoreParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoreParserService],
    }).compile();

    service = module.get<CoreParserService>(CoreParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    it('should parse simple GET request', () => {
      const request = {
        User: {
          id: 1,
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('SELECT');
      expect(result.tables.User.where).toEqual({ id: 1 });
    });

    it('should parse GETS request', () => {
      const request = {
        'User[]': {
          id: { '>=': 1 },
          '@order': 'id-',
        },
      };

      const result = service.parse(request, RequestMethod.GETS);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('SELECT');
      expect(result.tables.User.isArray).toBe(true);
      expect(result.tables.User.order).toEqual([{ column: 'id', direction: 'DESC' }]);
    });

    it('should parse HEAD request', () => {
      const request = {
        User: {
          id: 1,
        },
      };

      const result = service.parse(request, RequestMethod.HEAD);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('COUNT');
    });

    it('should parse HEADS request', () => {
      const request = {
        'User[]': {
          id: { '>=': 1 },
        },
      };

      const result = service.parse(request, RequestMethod.HEADS);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('COUNT');
      expect(result.tables.User.isArray).toBe(true);
    });

    it('should parse POST request', () => {
      const request = {
        User: {
          name: '张三',
          age: 25,
        },
      };

      const result = service.parse(request, RequestMethod.POST);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('INSERT');
      expect(result.tables.User.data).toEqual({ name: '张三', age: 25 });
    });

    it('should parse PUT request', () => {
      const request = {
        User: {
          id: 1,
          name: '李四',
        },
      };

      const result = service.parse(request, RequestMethod.PUT);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('UPDATE');
      expect(result.tables.User.where).toEqual({ id: 1 });
      expect(result.tables.User.data).toEqual({ name: '李四' });
    });

    it('should parse DELETE request', () => {
      const request = {
        User: {
          id: 1,
        },
      };

      const result = service.parse(request, RequestMethod.DELETE);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables.User.operation).toBe('DELETE');
      expect(result.tables.User.where).toEqual({ id: 1 });
    });

    it('should parse CRUD request with multiple operations', () => {
      const request = {
        'User': {
          id: 1,
          name: '王五',
        },
        'Comment[]': {
          userId: 1,
        },
        'Moment': {
          id: 1,
          '@delete': true,
        },
      };

      const result = service.parse(request, RequestMethod.CRUD);

      expect(result.success).toBe(true);
      expect(result.tables).toHaveProperty('User');
      expect(result.tables).toHaveProperty('Comment');
      expect(result.tables).toHaveProperty('Moment');

      expect(result.tables.User.operation).toBe('UPDATE');
      expect(result.tables.Comment.operation).toBe('SELECT');
      expect(result.tables.Moment.operation).toBe('DELETE');
    });

    it('should parse request with JOIN', () => {
      const request = {
        User: {
          id: 1,
          'Comment@': {
            userId: 1,
          },
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.joins).toBeDefined();
      expect(result.tables.User.joins.length).toBeGreaterThan(0);
      expect(result.tables.User.joins[0].table).toBe('Comment');
      expect(result.tables.User.joins[0].type).toBe('APP');
    });

    it('should parse request with WHERE operators', () => {
      const request = {
        User: {
          id: { '>=': 1 },
          name: { '~': '张' },
          age: { '>': 20, '<': 30 },
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.where).toEqual({
        id: { $gte: 1 },
        name: { $like: '%张%' },
        age: { $gt: 20, $lt: 30 },
      });
    });

    it('should parse request with IN operator', () => {
      const request = {
        User: {
          id: { '{}': [1, 2, 3] },
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.where).toEqual({
        id: { $in: [1, 2, 3] },
      });
    });

    it('should parse request with BETWEEN operator', () => {
      const request = {
        User: {
          age: { '><': [20, 30] },
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.where).toEqual({
        age: { $between: [20, 30] },
      });
    });

    it('should parse request with GROUP BY', () => {
      const request = {
        User: {
          '@group': 'department',
          'COUNT(id)': 'count',
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.group).toEqual(['department']);
    });

    it('should parse request with ORDER BY', () => {
      const request = {
        User: {
          '@order': 'id+,name-',
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.order).toEqual([
        { column: 'id', direction: 'ASC' },
        { column: 'name', direction: 'DESC' },
      ]);
    });

    it('should parse request with LIMIT and OFFSET', () => {
      const request = {
        'User[]': {
          '@limit': 10,
          '@offset': 20,
        },
      };

      const result = service.parse(request, RequestMethod.GETS);

      expect(result.success).toBe(true);
      expect(result.tables.User.limit).toBe(10);
      expect(result.tables.User.offset).toBe(20);
    });

    it('should parse request with column selection', () => {
      const request = {
        User: {
          id: 1,
          '@column': 'id,name,age',
        },
      };

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(true);
      expect(result.tables.User.columns).toEqual(['id', 'name', 'age']);
    });

    it('should handle invalid request format', () => {
      const request = null;

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty request', () => {
      const request = {};

      const result = service.parse(request, RequestMethod.GET);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('parseWhere', () => {
    it('should parse simple WHERE condition', () => {
      const where = { id: 1 };
      const result = service['parseWhere'](where);

      expect(result).toEqual({ id: 1 });
    });

    it('should parse WHERE with operators', () => {
      const where = { id: { '>=': 1 } };
      const result = service['parseWhere'](where);

      expect(result).toEqual({ id: { $gte: 1 } });
    });

    it('should parse WHERE with IN operator', () => {
      const where = { id: { '{}': [1, 2, 3] } };
      const result = service['parseWhere'](where);

      expect(result).toEqual({ id: { $in: [1, 2, 3] } });
    });

    it('should parse WHERE with LIKE operator', () => {
      const where = { name: { '~': '张' } };
      const result = service['parseWhere'](where);

      expect(result).toEqual({ name: { $like: '%张%' } });
    });

    it('should parse WHERE with multiple operators', () => {
      const where = { age: { '>': 20, '<': 30 } };
      const result = service['parseWhere'](where);

      expect(result).toEqual({ age: { $gt: 20, $lt: 30 } });
    });

    it('should parse WHERE with logical operators', () => {
      const where = {
        $or: [
          { id: 1 },
          { name: '张三' },
        ],
      };
      const result = service['parseWhere'](where);

      expect(result).toHaveProperty('$or');
      expect(result.$or).toHaveLength(2);
    });
  });

  describe('parseJoin', () => {
    it('should parse APP join', () => {
      const join = { 'Comment@': { userId: 1 } };
      const result = service['parseJoin'](join);

      expect(result).toBeDefined();
      expect(result[0].table).toBe('Comment');
      expect(result[0].type).toBe('APP');
    });

    it('should parse INNER join', () => {
      const join = { 'Comment&': { userId: 1 } };
      const result = service['parseJoin'](join);

      expect(result).toBeDefined();
      expect(result[0].type).toBe('INNER');
    });

    it('should parse LEFT join', () => {
      const join = { 'Comment<': { userId: 1 } };
      const result = service['parseJoin'](join);

      expect(result).toBeDefined();
      expect(result[0].type).toBe('LEFT');
    });

    it('should parse RIGHT join', () => {
      const join = { 'Comment>': { userId: 1 } };
      const result = service['parseJoin'](join);

      expect(result).toBeDefined();
      expect(result[0].type).toBe('RIGHT');
    });

    it('should parse FULL join', () => {
      const join = { 'Comment|': { userId: 1 } };
      const result = service['parseJoin'](join);

      expect(result).toBeDefined();
      expect(result[0].type).toBe('FULL');
    });
  });

  describe('parseOrder', () => {
    it('should parse single column order', () => {
      const order = 'id+';
      const result = service['parseOrder'](order);

      expect(result).toEqual([{ column: 'id', direction: 'ASC' }]);
    });

    it('should parse multiple columns order', () => {
      const order = 'id+,name-';
      const result = service['parseOrder'](order);

      expect(result).toEqual([
        { column: 'id', direction: 'ASC' },
        { column: 'name', direction: 'DESC' },
      ]);
    });

    it('should handle empty order', () => {
      const order = '';
      const result = service['parseOrder'](order);

      expect(result).toEqual([]);
    });
  });

  describe('parseColumns', () => {
    it('should parse column list', () => {
      const columns = 'id,name,age';
      const result = service['parseColumns'](columns);

      expect(result).toEqual(['id', 'name', 'age']);
    });

    it('should handle empty columns', () => {
      const columns = '';
      const result = service['parseColumns'](columns);

      expect(result).toEqual([]);
    });

    it('should handle single column', () => {
      const columns = 'id';
      const result = service['parseColumns'](columns);

      expect(result).toEqual(['id']);
    });
  });
});
