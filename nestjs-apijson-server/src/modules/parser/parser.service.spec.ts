import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParserService } from './parser.service';
import { APIJSONRequest, ParseResult } from '@/interfaces/apijson-request.interface';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    service = new ParserService();
  });

  describe('parse', () => {
    it('should parse a simple APIJSON request', async () => {
      const request: APIJSONRequest = {
        User: {
          columns: ['id', 'name'],
          where: { id: 1 },
          limit: 10,
        },
      };

      const result = await service.parse(request);

      expect(result).toBeDefined();
      expect(result.tables).toBeDefined();
      expect(result.directives).toBeDefined();
      expect(result.original).toEqual(request);
      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.name).toBe('User');
      expect(result.tables.User.columns).toEqual(['id', 'name']);
      expect(result.tables.User.where).toEqual({ id: 1 });
      expect(result.tables.User.limit).toBe(10);
    });

    it('should parse multiple tables', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id', 'name'], limit: 10 },
        Product: { columns: ['id', 'price'], limit: 20 },
      };

      const result = await service.parse(request);

      expect(Object.keys(result.tables)).toHaveLength(2);
      expect(result.tables.User).toBeDefined();
      expect(result.tables.Product).toBeDefined();
    });

    it('should parse directives', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'], limit: 10 },
        '@method': 'GET',
        '@page': 1,
        '@limit': 10,
      };

      const result = await service.parse(request);

      expect(result.directives).toBeDefined();
      expect(result.directives['@method']).toBeDefined();
      expect(result.directives['@page']).toBeDefined();
      expect(result.directives['@limit']).toBeDefined();
    });

    it('should handle empty request', async () => {
      const request: APIJSONRequest = {};

      const result = await service.parse(request);

      expect(result.tables).toEqual({});
      expect(result.directives).toEqual({});
      expect(result.original).toEqual({});
    });

    it('should handle array table query', async () => {
      const request: APIJSONRequest = {
        User: [{ id: 1 }, { id: 2 }],
      };

      const result = await service.parse(request);

      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.columns).toEqual(['*']);
      expect(result.tables.User.limit).toBe(10);
    });

    it('should handle table query with all default values', async () => {
      const request: APIJSONRequest = {
        User: {},
      };

      const result = await service.parse(request);

      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.columns).toEqual(['*']);
      expect(result.tables.User.where).toEqual({});
      expect(result.tables.User.joins).toEqual([]);
      expect(result.tables.User.group).toEqual([]);
      expect(result.tables.User.having).toEqual({});
      expect(result.tables.User.order).toEqual([]);
      expect(result.tables.User.limit).toBe(10);
      expect(result.tables.User.offset).toBe(0);
    });

    it('should handle complex table query', async () => {
      const request: APIJSONRequest = {
        User: {
          columns: ['id', 'name', 'email'],
          where: { status: 'active', age: { $gt: 18 } },
          joins: [
            { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
          ],
          group: ['department'],
          having: { count: { $gt: 5 } },
          order: ['name+', 'createdAt-'],
          limit: 50,
          offset: 10,
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.columns).toEqual(['id', 'name', 'email']);
      expect(result.tables.User.where).toEqual({ status: 'active', age: { $gt: 18 } });
      expect(result.tables.User.joins).toHaveLength(1);
      expect(result.tables.User.group).toEqual(['department']);
      expect(result.tables.User.having).toEqual({ count: { $gt: 5 } });
      expect(result.tables.User.order).toEqual(['name+', 'createdAt-']);
      expect(result.tables.User.limit).toBe(50);
      expect(result.tables.User.offset).toBe(10);
    });

    it('should handle all supported directives', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@method': 'POST',
        '@page': 1,
        '@limit': 10,
        '@offset': 0,
        '@order': 'name+',
        '@cache': true,
        '@total': true,
        '@count': true,
        '@search': 'keyword',
        '@group': 'category',
      };

      const result = await service.parse(request);

      // The request only contains 10 directives, so we expect 10 to be parsed
      expect(Object.keys(result.directives)).toHaveLength(10);
      expect(result.directives['@method']).toBeDefined();
      expect(result.directives['@page']).toBeDefined();
      expect(result.directives['@limit']).toBeDefined();
      expect(result.directives['@offset']).toBeDefined();
      expect(result.directives['@order']).toBeDefined();
      expect(result.directives['@cache']).toBeDefined();
      expect(result.directives['@total']).toBeDefined();
      expect(result.directives['@count']).toBeDefined();
      expect(result.directives['@search']).toBeDefined();
      expect(result.directives['@group']).toBeDefined();
    });

    it('should handle unknown directives gracefully', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@unknownDirective': 'value',
      };

      const result = await service.parse(request);

      // Unknown directives should be ignored
      expect(result.directives['@unknownDirective']).toBeUndefined();
    });

    it('should preserve original request', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@method': 'GET',
      };

      const result = await service.parse(request);

      expect(result.original).toEqual(request);
    });
  });

  describe('parseTableQuery', () => {
    it('should parse table query with string columns', async () => {
      const request: APIJSONRequest = {
        User: {
          columns: 'id,name,email',
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.columns).toEqual('id,name,email');
    });

    it('should parse table query with array columns', async () => {
      const request: APIJSONRequest = {
        User: {
          columns: ['id', 'name', 'email'],
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.columns).toEqual(['id', 'name', 'email']);
    });

    it('should handle table query with joins', async () => {
      const request: APIJSONRequest = {
        User: {
          joins: [
            { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
            { type: 'LEFT', table: 'Order', on: 'User.id = Order.userId' },
          ],
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.joins).toHaveLength(2);
      expect(result.tables.User.joins[0].type).toBe('INNER');
      expect(result.tables.User.joins[1].type).toBe('LEFT');
    });

    it('should handle table query with group', async () => {
      const request: APIJSONRequest = {
        User: {
          group: ['department', 'role'],
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.group).toEqual(['department', 'role']);
    });

    it('should handle table query with having', async () => {
      const request: APIJSONRequest = {
        User: {
          having: { count: { $gt: 5 } },
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.having).toEqual({ count: { $gt: 5 } });
    });

    it('should handle table query with order', async () => {
      const request: APIJSONRequest = {
        User: {
          order: ['name+', 'createdAt-'],
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.order).toEqual(['name+', 'createdAt-']);
    });

    it('should handle table query with custom limit', async () => {
      const request: APIJSONRequest = {
        User: {
          limit: 100,
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.limit).toBe(100);
    });

    it('should handle table query with custom offset', async () => {
      const request: APIJSONRequest = {
        User: {
          offset: 50,
        },
      };

      const result = await service.parse(request);

      expect(result.tables.User.offset).toBe(50);
    });

    it('should handle null table query', async () => {
      const request: APIJSONRequest = {
        User: null,
      };

      const result = await service.parse(request);

      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.columns).toEqual(['*']);
    });

    it('should handle undefined table query', async () => {
      const request: APIJSONRequest = {
        User: undefined,
      };

      const result = await service.parse(request);

      expect(result.tables.User).toBeDefined();
      expect(result.tables.User.columns).toEqual(['*']);
    });
  });

  describe('Directive Parsing', () => {
    it('should parse @method directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@method': 'POST',
      };

      const result = await service.parse(request);

      expect(result.directives['@method']).toBeDefined();
    });

    it('should parse @page directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@page': 2,
      };

      const result = await service.parse(request);

      expect(result.directives['@page']).toBeDefined();
    });

    it('should parse @limit directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@limit': 50,
      };

      const result = await service.parse(request);

      expect(result.directives['@limit']).toBeDefined();
    });

    it('should parse @offset directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@offset': 20,
      };

      const result = await service.parse(request);

      expect(result.directives['@offset']).toBeDefined();
    });

    it('should parse @order directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@order': 'name+',
      };

      const result = await service.parse(request);

      expect(result.directives['@order']).toBeDefined();
    });

    it('should parse @cache directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@cache': true,
      };

      const result = await service.parse(request);

      expect(result.directives['@cache']).toBeDefined();
    });

    it('should parse @total directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@total': true,
      };

      const result = await service.parse(request);

      expect(result.directives['@total']).toBeDefined();
    });

    it('should parse @count directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@count': true,
      };

      const result = await service.parse(request);

      expect(result.directives['@count']).toBeDefined();
    });

    it('should parse @search directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@search': 'keyword',
      };

      const result = await service.parse(request);

      expect(result.directives['@search']).toBeDefined();
    });

    it('should parse @group directive', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
        '@group': 'category',
      };

      const result = await service.parse(request);

      expect(result.directives['@group']).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long table name', async () => {
      const longTableName = 'a'.repeat(100);
      const request: APIJSONRequest = {
        [longTableName]: { columns: ['id'] },
      };

      const result = await service.parse(request);

      expect(result.tables[longTableName]).toBeDefined();
    });

    it('should handle table name with special characters', async () => {
      const request: APIJSONRequest = {
        'User_Table': { columns: ['id'] },
      };

      const result = await service.parse(request);

      expect(result.tables['User_Table']).toBeDefined();
    });

    it('should handle table name with numbers', async () => {
      const request: APIJSONRequest = {
        'User123': { columns: ['id'] },
      };

      const result = await service.parse(request);

      expect(result.tables['User123']).toBeDefined();
    });

    it('should handle very large limit', async () => {
      const request: APIJSONRequest = {
        User: { limit: 999999 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.limit).toBe(999999);
    });

    it('should handle very large offset', async () => {
      const request: APIJSONRequest = {
        User: { offset: 999999 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.offset).toBe(999999);
    });

    it('should handle zero limit', async () => {
      const request: APIJSONRequest = {
        User: { limit: 0 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.limit).toBe(10);
    });

    it('should handle zero offset', async () => {
      const request: APIJSONRequest = {
        User: { offset: 0 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.offset).toBe(0);
    });

    it('should handle negative limit', async () => {
      const request: APIJSONRequest = {
        User: { limit: -10 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.limit).toBe(-10);
    });

    it('should handle negative offset', async () => {
      const request: APIJSONRequest = {
        User: { offset: -10 },
      };

      const result = await service.parse(request);

      expect(result.tables.User.offset).toBe(-10);
    });

    it('should handle many tables', async () => {
      const request: APIJSONRequest = {};
      for (let i = 0; i < 50; i++) {
        request[`Table${i}`] = { columns: ['id'] };
      }

      const result = await service.parse(request);

      expect(Object.keys(result.tables)).toHaveLength(50);
    });

    it('should handle many directives', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
      };
      const directives = ['@a', '@b', '@c', '@d', '@e', '@f', '@g', '@h', '@i', '@j'];
      directives.forEach(d => {
        request[d] = 'value';
      });

      const result = await service.parse(request);

      // Unknown directives are ignored, so we expect 0 directives to be parsed
      expect(Object.keys(result.directives)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed request without throwing', async () => {
      const request: any = {};

      const result = await service.parse(request);

      expect(result).toBeDefined();
      expect(result.tables).toBeDefined();
      expect(result.directives).toBeDefined();
    });

    it('should handle request with circular reference', async () => {
      const request: APIJSONRequest = {
        User: { columns: ['id'] },
      };
      (request as any).circular = request;

      const result = await service.parse(request);

      expect(result).toBeDefined();
    });
  });
});
