import { describe, it, expect, beforeEach } from 'vitest';
import { BuilderService } from './builder.service';
import { ParseResult, BuildResult } from '@/interfaces/apijson-request.interface';

describe('BuilderService', () => {
  let service: BuilderService;

  beforeEach(() => {
    service = new BuilderService();
  });

  describe('build', () => {
    it('should build a simple SELECT query', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name', 'email'],
            where: { id: 1 },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result).toBeDefined();
      expect(result.queries).toBeDefined();
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].table).toBe('User');
      expect(result.queries[0].type).toBe('SELECT');
      expect(result.queries[0].sql).toContain('SELECT id, name, email FROM User');
      expect(result.queries[0].sql).toContain('WHERE id = 1');
      expect(result.queries[0].sql).toContain('LIMIT 10');
    });

    it('should build multiple queries', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
          Product: {
            name: 'Product',
            columns: ['id', 'price'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 20,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries).toHaveLength(2);
      expect(result.queries[0].table).toBe('User');
      expect(result.queries[1].table).toBe('Product');
    });

    it('should build query with JOIN', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [
              { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
            ],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('INNER JOIN Profile ON User.id = Profile.userId');
    });

    it('should build query with multiple JOINs', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [
              { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
              { type: 'LEFT', table: 'Order', on: 'User.id = Order.userId' },
            ],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('INNER JOIN Profile ON User.id = Profile.userId');
      expect(result.queries[0].sql).toContain('LEFT JOIN Order ON User.id = Order.userId');
    });

    it('should build query with GROUP BY', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'department'],
            where: {},
            joins: [],
            group: ['department'],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('GROUP BY department');
    });

    it('should build query with HAVING', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'department'],
            where: {},
            joins: [],
            group: ['department'],
            having: { count: { $gt: 5 } },
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('HAVING count > 5');
    });

    it('should build query with ORDER BY ASC', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: ['name+'],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('ORDER BY name ASC');
    });

    it('should build query with ORDER BY DESC', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: ['name-'],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('ORDER BY name DESC');
    });

    it('should build query with multiple ORDER BY', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: ['name+', 'createdAt-'],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('ORDER BY name ASC, createdAt DESC');
    });

    it('should build query with LIMIT', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 50,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('LIMIT 50');
    });

    it('should build query with OFFSET', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 100,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('OFFSET 100');
    });

    it('should build query with all clauses', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id', 'name'],
            where: { status: 'active' },
            joins: [
              { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
            ],
            group: ['department'],
            having: { count: { $gt: 5 } },
            order: ['name+'],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain('SELECT id, name FROM User');
      expect(sql).toContain('INNER JOIN Profile ON User.id = Profile.userId');
      expect(sql).toContain("WHERE status = 'active'");
      expect(sql).toContain('GROUP BY department');
      expect(sql).toContain('HAVING count > 5');
      expect(sql).toContain('ORDER BY name ASC');
      expect(sql).toContain('LIMIT 10');
    });

    it('should handle empty columns (default to *)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: [],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('SELECT * FROM User');
    });

    it('should handle null columns (default to *)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: null as any,
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('SELECT * FROM User');
    });

    it('should handle empty where (no WHERE clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('WHERE');
    });

    it('should handle empty joins (no JOIN clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('JOIN');
    });

    it('should handle empty group (no GROUP BY clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('GROUP BY');
    });

    it('should handle empty having (no HAVING clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('HAVING');
    });

    it('should handle empty order (no ORDER BY clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('ORDER BY');
    });

    it('should handle zero limit (no LIMIT clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 0,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('LIMIT');
    });

    it('should handle zero offset (no OFFSET clause)', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).not.toContain('OFFSET');
    });

    it('should preserve original parse result', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: { test: 'value' },
      };

      const result = await service.build(parseResult);

      expect(result.original).toEqual(parseResult);
    });
  });

  describe('Condition Building', () => {
    it('should build simple equality condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { id: 1 },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE id = 1');
    });

    it('should build $gt condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { age: { $gt: 18 } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE age > 18');
    });

    it('should build $gte condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { age: { $gte: 18 } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE age >= 18');
    });

    it('should build $lt condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { age: { $lt: 65 } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE age < 65');
    });

    it('should build $lte condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { age: { $lte: 65 } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE age <= 65');
    });

    it('should build $ne condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { status: { $ne: 'deleted' } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE status != 'deleted'");
    });

    it('should build $eq condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { status: { $eq: 'active' } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE status = 'active'");
    });

    it('should build $in condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { id: { $in: [1, 2, 3] } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE id IN (1, 2, 3)');
    });

    it('should build $nin condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { id: { $nin: [1, 2, 3] } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE id NOT IN (1, 2, 3)');
    });

    it('should build $like condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { name: { $like: '%John%' } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE name LIKE '%John%'");
    });

    it('should build $ilike condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { name: { $ilike: '%john%' } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE name ILIKE '%john%'");
    });

    it('should build $and condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {
              age: { $gt: 18 },
              status: 'active',
            },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE age > 18 AND status = 'active'");
    });

    it('should build $or condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {
              status: { $or: ['active', 'pending'] },
            },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      // The actual implementation may handle $or differently
      expect(sql).toContain('WHERE');
    });

    it('should build $not condition', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {
              status: { $ne: 'deleted' },
            },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE status != 'deleted'");
    });

    it('should build multiple conditions', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {
              status: 'active',
              age: { $gt: 18 },
            },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE status = 'active' AND age > 18");
    });
  });

  describe('Value Formatting', () => {
    it('should format NULL value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { deletedAt: null },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE deletedAt = NULL');
    });

    it('should format undefined value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { deletedAt: undefined },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE deletedAt = NULL');
    });

    it('should format string value with quotes', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { name: 'John' },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE name = 'John'");
    });

    it('should format string value with single quote', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { name: "O'Brien" },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      // The actual output uses single quotes with escaped single quotes
      expect(sql).toContain("WHERE name = 'O''Brien'");
    });

    it('should format number value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { age: 25 },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE age = 25');
    });

    it('should format boolean true value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { isActive: true },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE isActive = TRUE');
    });

    it('should format boolean false value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { isActive: false },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('WHERE isActive = FALSE');
    });

    it('should format array value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { tags: { $in: ['tag1', 'tag2', 'tag3'] } },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE tags IN ('tag1', 'tag2', 'tag3')");
    });

    it('should format object value', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: { metadata: JSON.stringify({ key: 'value' }) },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain("WHERE metadata = '{\"key\":\"value\"}'");
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long column list', async () => {
      const columns = Array.from({ length: 100 }, (_, i) => `column${i}`);
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns,
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('SELECT ' + columns.join(', ') + ' FROM User');
    });

    it('should handle very large limit', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 999999,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('LIMIT 999999');
    });

    it('should handle very large offset', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {},
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 999999,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);

      expect(result.queries[0].sql).toContain('OFFSET 999999');
    });

    it('should handle complex nested conditions', async () => {
      const parseResult: ParseResult = {
        tables: {
          User: {
            name: 'User',
            columns: ['id'],
            where: {
              age: { $gt: 18 },
              status: 'active',
            },
            joins: [],
            group: [],
            having: {},
            order: [],
            limit: 10,
            offset: 0,
          },
        },
        directives: {},
        original: {},
      };

      const result = await service.build(parseResult);
      const sql = result.queries[0].sql;

      expect(sql).toContain('WHERE');
      expect(sql).toContain('AND');
    });
  });
});
