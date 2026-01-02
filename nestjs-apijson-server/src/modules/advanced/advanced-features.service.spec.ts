import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedFeaturesService } from './advanced-features.service';
import { MySQLBuilderService } from '../builder/mysql-builder.service';
import { MySQLExecutorService } from '../executor/mysql-executor.service';

/**
 * 高级特性服务单元测试
 */
describe('AdvancedFeaturesService', () => {
  let service: AdvancedFeaturesService;
  let builderService: MySQLBuilderService;
  let executorService: MySQLExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedFeaturesService,
        {
          provide: MySQLBuilderService,
          useValue: {
            buildWhereClause: jest.fn(),
            buildInsertQuery: jest.fn(),
            buildUpdateQuery: jest.fn(),
            buildDeleteQuery: jest.fn(),
          },
        },
        {
          provide: MySQLExecutorService,
          useValue: {
            query: jest.fn(),
            executeTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdvancedFeaturesService>(AdvancedFeaturesService);
    builderService = module.get<MySQLBuilderService>(MySQLBuilderService);
    executorService = module.get<MySQLExecutorService>(MySQLExecutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeSubqueries', () => {
    it('should execute subqueries successfully', async () => {
      const subqueries = [
        {
          alias: 'user_count',
          sql: 'SELECT COUNT(*) FROM `User`',
          params: [],
        },
      ];

      jest.spyOn(executorService, 'query').mockResolvedValue({
        data: [{ count: 10 }],
        count: 1,
      });

      const result = await service.executeSubqueries(subqueries);

      expect(result.size).toBe(1);
      expect(result.get('user_count')).toEqual([{ count: 10 }]);
    });

    it('should handle subquery errors', async () => {
      const subqueries = [
        {
          alias: 'user_count',
          sql: 'SELECT COUNT(*) FROM `User`',
          params: [],
        },
      ];

      jest.spyOn(executorService, 'query').mockRejectedValue(new Error('Database error'));

      const result = await service.executeSubqueries(subqueries);

      expect(result.size).toBe(1);
      expect(result.get('user_count')).toEqual([]);
    });
  });

  describe('buildSubquery', () => {
    it('should build subquery correctly', () => {
      const tableName = 'User';
      const where = { id: 1 };
      const alias = 'user_subquery';

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: ' WHERE `id` = ?',
        params: [1],
      });

      const result = service.buildSubquery(tableName, where, alias);

      expect(result.alias).toBe(alias);
      expect(result.sql).toContain('SELECT * FROM `User`');
      expect(result.sql).toContain('WHERE `id` = ?');
      expect(result.params).toEqual([1]);
    });
  });

  describe('buildAggregateQuery', () => {
    it('should build COUNT aggregate query', () => {
      const tableName = 'User';
      const aggregateFunction = 'COUNT';
      const column = 'id';
      const where = { id: { '>=': 1 } };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: ' WHERE `id` >= ?',
        params: [1],
      });

      const result = service.buildAggregateQuery(tableName, aggregateFunction, column, where);

      expect(result.table).toBe(tableName);
      expect(result.sql).toContain('SELECT COUNT(`id`)');
      expect(result.sql).toContain('FROM `User`');
      expect(result.sql).toContain('WHERE `id` >= ?');
      expect(result.params).toEqual([1]);
    });

    it('should build SUM aggregate query', () => {
      const tableName = 'User';
      const aggregateFunction = 'SUM';
      const column = 'age';
      const where = { age: { '>': 20 } };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: ' WHERE `age` > ?',
        params: [20],
      });

      const result = service.buildAggregateQuery(tableName, aggregateFunction, column, where);

      expect(result.sql).toContain('SELECT SUM(`age`)');
      expect(result.sql).toContain('FROM `User`');
      expect(result.params).toEqual([20]);
    });

    it('should build AVG aggregate query', () => {
      const tableName = 'User';
      const aggregateFunction = 'AVG';
      const column = 'score';

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      const result = service.buildAggregateQuery(tableName, aggregateFunction, column);

      expect(result.sql).toContain('SELECT AVG(`score`)');
      expect(result.sql).toContain('FROM `User`');
    });

    it('should build MIN aggregate query', () => {
      const tableName = 'User';
      const aggregateFunction = 'MIN';
      const column = 'age';

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      const result = service.buildAggregateQuery(tableName, aggregateFunction, column);

      expect(result.sql).toContain('SELECT MIN(`age`)');
    });

    it('should build MAX aggregate query', () => {
      const tableName = 'User';
      const aggregateFunction = 'MAX';
      const column = 'age';

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      const result = service.buildAggregateQuery(tableName, aggregateFunction, column);

      expect(result.sql).toContain('SELECT MAX(`age`)');
    });
  });

  describe('executeAggregateQuery', () => {
    it('should execute COUNT query and return result', async () => {
      const tableName = 'User';
      const aggregateFunction = 'COUNT';
      const column = 'id';
      const where = { id: { '>=': 1 } };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: ' WHERE `id` >= ?',
        params: [1],
      });

      jest.spyOn(executorService, 'query').mockResolvedValue({
        data: [{ 'COUNT(`id`)': 10 }],
        count: 1,
      });

      const result = await service.executeAggregateQuery(tableName, aggregateFunction, column, where);

      expect(result).toBe(10);
    });

    it('should return 0 when no data returned', async () => {
      const tableName = 'User';
      const aggregateFunction = 'COUNT';
      const column = 'id';

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      jest.spyOn(executorService, 'query').mockResolvedValue({
        data: [],
        count: 0,
      });

      const result = await service.executeAggregateQuery(tableName, aggregateFunction, column);

      expect(result).toBe(0);
    });
  });

  describe('buildGroupAggregateQuery', () => {
    it('should build group aggregate query', () => {
      const tableName = 'User';
      const groupBy = ['department'];
      const aggregateFunctions = {
        'COUNT(id)': 'COUNT(`id`)',
        'AVG(age)': 'AVG(`age`)',
      };
      const where = { department: 'IT' };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: ' WHERE `department` = ?',
        params: ['IT'],
      });

      const result = service.buildGroupAggregateQuery(tableName, groupBy, aggregateFunctions, where);

      expect(result.sql).toContain('SELECT COUNT(`id`) AS `COUNT(id)`, AVG(`age`) AS `AVG(age)`');
      expect(result.sql).toContain('FROM `User`');
      expect(result.sql).toContain('WHERE `department` = ?');
      expect(result.sql).toContain('GROUP BY `department`');
      expect(result.params).toEqual(['IT']);
    });

    it('should handle multiple group by columns', () => {
      const tableName = 'User';
      const groupBy = ['department', 'role'];
      const aggregateFunctions = {
        'COUNT(id)': 'COUNT(`id`)',
      };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      const result = service.buildGroupAggregateQuery(tableName, groupBy, aggregateFunctions);

      expect(result.sql).toContain('GROUP BY `department`, `role`');
    });
  });

  describe('executeGroupAggregateQuery', () => {
    it('should execute group aggregate query', async () => {
      const tableName = 'User';
      const groupBy = ['department'];
      const aggregateFunctions = {
        'COUNT(id)': 'COUNT(`id`)',
        'AVG(age)': 'AVG(`age`)',
      };

      jest.spyOn(builderService, 'buildWhereClause').mockReturnValue({
        where: '',
        params: [],
      });

      jest.spyOn(executorService, 'query').mockResolvedValue({
        data: [
          { department: 'IT', 'COUNT(id)': 10, 'AVG(age)': 30 },
          { department: 'HR', 'COUNT(id)': 5, 'AVG(age)': 28 },
        ],
        count: 2,
      });

      const result = await service.executeGroupAggregateQuery(tableName, groupBy, aggregateFunctions);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ department: 'IT', 'COUNT(id)': 10, 'AVG(age)': 30 });
    });
  });

  describe('buildTransactionQueries', () => {
    it('should build INSERT transaction query', () => {
      const queries = [
        {
          tableName: 'User',
          operation: 'INSERT' as const,
          data: { name: '张三', age: 25 },
        },
      ];

      jest.spyOn(builderService, 'buildInsertQuery').mockReturnValue({
        sql: 'INSERT INTO `User` (`name`, `age`) VALUES (?, ?)',
        params: ['张三', 25],
      });

      const result = service.buildTransactionQueries(queries);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('INSERT');
      expect(result[0].sql).toContain('INSERT INTO `User`');
    });

    it('should build UPDATE transaction query', () => {
      const queries = [
        {
          tableName: 'User',
          operation: 'UPDATE' as const,
          data: { name: '李四' },
          where: { id: 1 },
        },
      ];

      jest.spyOn(builderService, 'buildUpdateQuery').mockReturnValue({
        sql: 'UPDATE `User` SET `name` = ? WHERE `id` = ?',
        params: ['李四', 1],
      });

      const result = service.buildTransactionQueries(queries);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('UPDATE');
      expect(result[0].sql).toContain('UPDATE `User`');
    });

    it('should build DELETE transaction query', () => {
      const queries = [
        {
          tableName: 'User',
          operation: 'DELETE' as const,
          data: {},
          where: { id: 1 },
        },
      ];

      jest.spyOn(builderService, 'buildDeleteQuery').mockReturnValue({
        sql: 'DELETE FROM `User` WHERE `id` = ?',
        params: [1],
      });

      const result = service.buildTransactionQueries(queries);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('DELETE');
      expect(result[0].sql).toContain('DELETE FROM `User`');
    });

    it('should build multiple transaction queries', () => {
      const queries = [
        {
          tableName: 'User',
          operation: 'INSERT' as const,
          data: { name: '张三', age: 25 },
        },
        {
          tableName: 'Comment',
          operation: 'INSERT' as const,
          data: { userId: 1, content: '测试评论' },
        },
      ];

      jest.spyOn(builderService, 'buildInsertQuery')
        .mockReturnValueOnce({
          sql: 'INSERT INTO `User` (`name`, `age`) VALUES (?, ?)',
          params: ['张三', 25],
        })
        .mockReturnValueOnce({
          sql: 'INSERT INTO `Comment` (`userId`, `content`) VALUES (?, ?)',
          params: [1, '测试评论'],
        });

      const result = service.buildTransactionQueries(queries);

      expect(result).toHaveLength(2);
      expect(result[0].table).toBe('User');
      expect(result[1].table).toBe('Comment');
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const queries = [
        {
          tableName: 'User',
          operation: 'INSERT' as const,
          data: { name: '张三', age: 25 },
        },
      ];

      jest.spyOn(builderService, 'buildInsertQuery').mockReturnValue({
        sql: 'INSERT INTO `User` (`name`, `age`) VALUES (?, ?)',
        params: ['张三', 25],
      });

      jest.spyOn(executorService, 'executeTransaction').mockResolvedValue([
        { insertId: 1, affectedRows: 1 },
      ]);

      const result = await service.executeTransaction(queries);

      expect(result).toHaveLength(1);
      expect(result[0].insertId).toBe(1);
    });
  });

  describe('buildSubqueryCondition', () => {
    it('should build subquery condition', () => {
      const columnName = 'userId';
      const operator = 'in';
      const subquery = {
        alias: 'user_ids',
        sql: 'SELECT `id` FROM `User` WHERE `status` = ?',
        params: ['active'],
      };

      const result = service.buildSubqueryCondition(columnName, operator, subquery);

      expect(result).toHaveProperty(columnName);
      expect(result[columnName]).toHaveProperty(`$${operator}`);
      expect(result[columnName].$in).toContain('SELECT `id` FROM `User` WHERE `status` = ?');
      expect(result[columnName]).toHaveProperty('$subqueryParams');
      expect(result[columnName].$subqueryParams).toEqual(['active']);
    });
  });

  describe('buildComplexWhere', () => {
    it('should build complex WHERE with subqueries', () => {
      const conditions = [
        { userId: { $in: 'subquery:user_ids' } },
      ];

      const subqueries = new Map([
        ['user_ids', {
          alias: 'user_ids',
          sql: 'SELECT `id` FROM `User` WHERE `status` = ?',
          params: ['active'],
        }],
      ]);

      const result = service.buildComplexWhere(conditions, subqueries);

      expect(result).toHaveProperty('userId');
      expect(result.userId).toHaveProperty('$in');
      expect(result.userId.$in).toContain('SELECT `id` FROM `User` WHERE `status` = ?');
      expect(result.userId).toHaveProperty('$subqueryParams');
      expect(result.userId.$subqueryParams).toEqual(['active']);
    });

    it('should build complex WHERE without subqueries', () => {
      const conditions = [
        { id: 1 },
        { name: '张三' },
      ];

      const subqueries = new Map();

      const result = service.buildComplexWhere(conditions, subqueries);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.id).toBe(1);
      expect(result.name).toBe('张三');
    });
  });
});
