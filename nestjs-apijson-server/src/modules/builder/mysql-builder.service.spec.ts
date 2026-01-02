import { Test, TestingModule } from '@nestjs/testing';
import { MySQLBuilderService } from './mysql-builder.service';
import { Query } from '@/interfaces/apijson-request.interface';

/**
 * MySQL 构建器服务单元测试
 */
describe('MySQLBuilderService', () => {
  let service: MySQLBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MySQLBuilderService],
    }).compile();

    service = module.get<MySQLBuilderService>(MySQLBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildQuery', () => {
    it('should build SELECT query', () => {
      const query: Query = {
        table: 'User',
        type: 'SELECT',
        columns: ['id', 'name', 'age'],
        where: { id: 1 },
        joins: [],
        group: [],
        having: {},
        order: [{ column: 'id', direction: 'ASC' }],
        limit: 10,
        offset: 0,
      };

      const result = service.buildQuery(query);

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM `User`');
      expect(result.sql).toContain('WHERE `id` = ?');
      expect(result.sql).toContain('ORDER BY `id` ASC');
      expect(result.sql).toContain('LIMIT 10');
      expect(result.params).toEqual([1]);
    });

    it('should build INSERT query', () => {
      const query: Query = {
        table: 'User',
        type: 'INSERT',
        columns: [],
        where: {},
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 0,
        offset: 0,
        data: { name: '张三', age: 25 },
      };

      const result = service.buildQuery(query);

      expect(result.sql).toContain('INSERT INTO `User`');
      expect(result.sql).toContain('(`name`, `age`)');
      expect(result.sql).toContain('VALUES (?, ?)');
      expect(result.params).toEqual(['张三', 25]);
    });

    it('should build UPDATE query', () => {
      const query: Query = {
        table: 'User',
        type: 'UPDATE',
        columns: [],
        where: { id: 1 },
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 0,
        offset: 0,
        data: { name: '李四' },
      };

      const result = service.buildQuery(query);

      expect(result.sql).toContain('UPDATE `User`');
      expect(result.sql).toContain('SET `name` = ?');
      expect(result.sql).toContain('WHERE `id` = ?');
      expect(result.params).toEqual(['李四', 1]);
    });

    it('should build DELETE query', () => {
      const query: Query = {
        table: 'User',
        type: 'DELETE',
        columns: [],
        where: { id: 1 },
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 0,
        offset: 0,
      };

      const result = service.buildQuery(query);

      expect(result.sql).toContain('DELETE FROM `User`');
      expect(result.sql).toContain('WHERE `id` = ?');
      expect(result.params).toEqual([1]);
    });

    it('should build COUNT query', () => {
      const query: Query = {
        table: 'User',
        type: 'COUNT',
        columns: [],
        where: { id: { '>=': 1 } },
        joins: [],
        group: [],
        having: {},
        order: [],
        limit: 0,
        offset: 0,
      };

      const result = service.buildQuery(query);

      expect(result.sql).toContain('SELECT COUNT(*)');
      expect(result.sql).toContain('FROM `User`');
      expect(result.sql).toContain('WHERE `id` >= ?');
      expect(result.params).toEqual([1]);
    });
  });

  describe('buildWhereClause', () => {
    it('should build simple WHERE clause', () => {
      const where = { id: 1 };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` = ?');
      expect(result.params).toEqual([1]);
    });

    it('should build WHERE with $gte operator', () => {
      const where = { id: { $gte: 1 } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` >= ?');
      expect(result.params).toEqual([1]);
    });

    it('should build WHERE with $gt operator', () => {
      const where = { id: { $gt: 1 } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` > ?');
      expect(result.params).toEqual([1]);
    });

    it('should build WHERE with $lte operator', () => {
      const where = { id: { $lte: 10 } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` <= ?');
      expect(result.params).toEqual([10]);
    });

    it('should build WHERE with $lt operator', () => {
      const where = { id: { $lt: 10 } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` < ?');
      expect(result.params).toEqual([10]);
    });

    it('should build WHERE with $ne operator', () => {
      const where = { id: { $ne: 1 } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` != ?');
      expect(result.params).toEqual([1]);
    });

    it('should build WHERE with $like operator', () => {
      const where = { name: { $like: '%张%' } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `name` LIKE ?');
      expect(result.params).toEqual(['%张%']);
    });

    it('should build WHERE with $notLike operator', () => {
      const where = { name: { $notLike: '%张%' } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `name` NOT LIKE ?');
      expect(result.params).toEqual(['%张%']);
    });

    it('should build WHERE with $in operator', () => {
      const where = { id: { $in: [1, 2, 3] } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` IN (?, ?, ?)');
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('should build WHERE with $notIn operator', () => {
      const where = { id: { $notIn: [1, 2, 3] } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `id` NOT IN (?, ?, ?)');
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('should build WHERE with $between operator', () => {
      const where = { age: { $between: [20, 30] } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `age` BETWEEN ? AND ?');
      expect(result.params).toEqual([20, 30]);
    });

    it('should build WHERE with $notBetween operator', () => {
      const where = { age: { $notBetween: [20, 30] } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE `age` NOT BETWEEN ? AND ?');
      expect(result.params).toEqual([20, 30]);
    });

    it('should build WHERE with $contains operator', () => {
      const where = { tags: { $contains: 'tag1' } };
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe(' WHERE FIND_IN_SET(?, `tags`)');
      expect(result.params).toEqual(['tag1']);
    });

    it('should build WHERE with $and operator', () => {
      const where = {
        $and: [
          { id: { $gte: 1 } },
          { age: { $lt: 30 } },
        ],
      };
      const result = service['buildWhereClause'](where);

      expect(result.where).toContain('WHERE (`id` >= ? AND `age` < ?)');
      expect(result.params).toEqual([1, 30]);
    });

    it('should build WHERE with $or operator', () => {
      const where = {
        $or: [
          { id: 1 },
          { name: '张三' },
        ],
      };
      const result = service['buildWhereClause'](where);

      expect(result.where).toContain('WHERE (`id` = ? OR `name` = ?)');
      expect(result.params).toEqual([1, '张三']);
    });

    it('should build WHERE with $not operator', () => {
      const where = {
        $not: { id: 1 },
      };
      const result = service['buildWhereClause'](where);

      expect(result.where).toContain('WHERE NOT (`id` = ?)');
      expect(result.params).toEqual([1]);
    });

    it('should build WHERE with multiple conditions', () => {
      const where = {
        id: { $gte: 1 },
        age: { $gt: 20, $lt: 30 },
      };
      const result = service['buildWhereClause'](where);

      expect(result.where).toContain('WHERE `id` >= ? AND `age` > ? AND `age` < ?');
      expect(result.params).toEqual([1, 20, 30]);
    });

    it('should handle empty WHERE', () => {
      const where = {};
      const result = service['buildWhereClause'](where);

      expect(result.where).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('buildJoinClause', () => {
    it('should build APP JOIN', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'APP',
          alias: 'Comment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('LEFT JOIN `Comment`');
      expect(result.params).toEqual([1]);
    });

    it('should build INNER JOIN', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'INNER',
          alias: 'Comment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('INNER JOIN `Comment`');
    });

    it('should build LEFT JOIN', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'LEFT',
          alias: 'Comment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('LEFT JOIN `Comment`');
    });

    it('should build RIGHT JOIN', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'RIGHT',
          alias: 'Comment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('RIGHT JOIN `Comment`');
    });

    it('should build FULL JOIN', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'FULL',
          alias: 'Comment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('FULL OUTER JOIN `Comment`');
    });

    it('should build multiple JOINs', () => {
      const joins = [
        {
          table: 'Comment',
          type: 'LEFT',
          alias: 'Comment',
          on: { userId: 1 },
        },
        {
          table: 'Moment',
          type: 'INNER',
          alias: 'Moment',
          on: { userId: 1 },
        },
      ];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toContain('LEFT JOIN `Comment`');
      expect(result.join).toContain('INNER JOIN `Moment`');
      expect(result.params).toEqual([1, 1]);
    });

    it('should handle empty JOINs', () => {
      const joins = [];
      const result = service['buildJoinClause'](joins);

      expect(result.join).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('buildGroupClause', () => {
    it('should build GROUP BY clause', () => {
      const group = ['department', 'role'];
      const result = service['buildGroupClause'](group);

      expect(result.group).toBe(' GROUP BY `department`, `role`');
    });

    it('should handle empty GROUP BY', () => {
      const group = [];
      const result = service['buildGroupClause'](group);

      expect(result.group).toBe('');
    });

    it('should handle single column GROUP BY', () => {
      const group = ['department'];
      const result = service['buildGroupClause'](group);

      expect(result.group).toBe(' GROUP BY `department`');
    });
  });

  describe('buildHavingClause', () => {
    it('should build HAVING clause', () => {
      const having = { count: { $gt: 5 } };
      const result = service['buildHavingClause'](having);

      expect(result.having).toBe(' HAVING `count` > ?');
      expect(result.params).toEqual([5]);
    });

    it('should handle empty HAVING', () => {
      const having = {};
      const result = service['buildHavingClause'](having);

      expect(result.having).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('buildOrderClause', () => {
    it('should build ORDER BY clause', () => {
      const order = [
        { column: 'id', direction: 'ASC' },
        { column: 'name', direction: 'DESC' },
      ];
      const result = service['buildOrderClause'](order);

      expect(result.order).toBe(' ORDER BY `id` ASC, `name` DESC');
    });

    it('should handle empty ORDER BY', () => {
      const order = [];
      const result = service['buildOrderClause'](order);

      expect(result.order).toBe('');
    });

    it('should handle single column ORDER BY', () => {
      const order = [{ column: 'id', direction: 'ASC' }];
      const result = service['buildOrderClause'](order);

      expect(result.order).toBe(' ORDER BY `id` ASC');
    });
  });

  describe('buildLimitClause', () => {
    it('should build LIMIT clause', () => {
      const limit = 10;
      const offset = 20;
      const result = service['buildLimitClause'](limit, offset);

      expect(result.limit).toBe(' LIMIT 10 OFFSET 20');
    });

    it('should handle LIMIT only', () => {
      const limit = 10;
      const offset = 0;
      const result = service['buildLimitClause'](limit, offset);

      expect(result.limit).toBe(' LIMIT 10');
    });

    it('should handle empty LIMIT', () => {
      const limit = 0;
      const offset = 0;
      const result = service['buildLimitClause'](limit, offset);

      expect(result.limit).toBe('');
    });
  });
});
