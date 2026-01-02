import { describe, it, expect, beforeEach } from 'vitest';
import { APIJSONValidationPipe } from './apijson-validation.pipe';
import { BadRequestException } from '@nestjs/common';

describe('APIJSONValidationPipe', () => {
  let pipe: APIJSONValidationPipe;

  beforeEach(() => {
    pipe = new APIJSONValidationPipe();
  });

  describe('transform', () => {
    it('should return empty object for null input', async () => {
      const result = await pipe.transform(null);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined input', async () => {
      const result = await pipe.transform(undefined);
      expect(result).toEqual({});
    });

    it('should return valid object', async () => {
      const input = {
        User: {
          columns: ['id', 'name'],
          where: { id: 1 },
          limit: 10,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should throw BadRequestException for array input', async () => {
      const input = [{ id: 1 }];
      await expect(pipe.transform(input as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for string input', async () => {
      const input = 'invalid';
      await expect(pipe.transform(input as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for number input', async () => {
      const input = 123;
      await expect(pipe.transform(input as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for boolean input', async () => {
      const input = true;
      await expect(pipe.transform(input as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with proper error message', async () => {
      const input = 'invalid';
      try {
        await pipe.transform(input as any);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response).toHaveProperty('status', 'error');
        expect(response).toHaveProperty('code', 400);
        expect(response).toHaveProperty('message', '请求体必须是对象');
        expect(response).toHaveProperty('errors');
      }
    });
  });

  describe('Table Name Validation', () => {
    it('should accept valid table names', async () => {
      const input = {
        User: { columns: ['id'] },
        Product: { columns: ['id'] },
        user_profile: { columns: ['id'] },
        User123: { columns: ['id'] },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject table names starting with @', async () => {
      const input = {
        '@InvalidTable': { columns: ['id'] },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject table names with invalid characters', async () => {
      const invalidNames = [
        'Invalid<>Table',
        'Invalid"Table',
        'Invalid:Table',
        'Invalid/\\Table',
        'Invalid|Table',
        'Invalid?Table',
        'Invalid*Table',
      ];

      for (const name of invalidNames) {
        const input = { [name]: { columns: ['id'] } };
        await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject table names exceeding max length', async () => {
      const longName = 'a'.repeat(65);
      const input = { [longName]: { columns: ['id'] } };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should accept table names at max length', async () => {
      const name = 'a'.repeat(64);
      const input = { [name]: { columns: ['id'] } };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });
  });

  describe('Columns Validation', () => {
    it('should accept string columns', async () => {
      const input = {
        User: {
          columns: 'id,name,email',
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept array columns', async () => {
      const input = {
        User: {
          columns: ['id', 'name', 'email'],
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-string array columns', async () => {
      const input = {
        User: {
          columns: [1, 2, 3],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid column names', async () => {
      const input = {
        User: {
          columns: ['id', 'invalid<>column', 'name'],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Conditions Validation', () => {
    it('should accept valid where conditions', async () => {
      const input = {
        User: {
          where: {
            id: 1,
            status: 'active',
            age: { $gt: 18 },
          },
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-object where conditions', async () => {
      const input = {
        User: {
          where: 'invalid',
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should accept null where conditions', async () => {
      const input = {
        User: {
          where: null,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });
  });

  describe('Joins Validation', () => {
    it('should accept valid joins', async () => {
      const input = {
        User: {
          joins: [
            { type: 'INNER', table: 'Profile', on: 'User.id = Profile.userId' },
            { type: 'LEFT', table: 'Order', on: 'User.id = Order.userId' },
          ],
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-array joins', async () => {
      const input = {
        User: {
          joins: 'invalid',
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject join without table name', async () => {
      const input = {
        User: {
          joins: [{ type: 'INNER', on: 'User.id = Profile.userId' }],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject join without type', async () => {
      const input = {
        User: {
          joins: [{ table: 'Profile', on: 'User.id = Profile.userId' }],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid join types', async () => {
      const invalidTypes = ['INVALID', 'wrong', 'bad'];
      
      for (const type of invalidTypes) {
        const input = {
          User: {
            joins: [{ type, table: 'Profile', on: 'User.id = Profile.userId' }],
          },
        };
        await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
      }
    });

    it('should accept all valid join types', async () => {
      const validTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];
      
      for (const type of validTypes) {
        const input = {
          User: {
            joins: [{ type, table: 'Profile', on: 'User.id = Profile.userId' }],
          },
        };
        const result = await pipe.transform(input);
        expect(result).toEqual(input);
      }
    });
  });

  describe('Group Validation', () => {
    it('should accept string group', async () => {
      const input = {
        User: {
          group: 'department,role',
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept array group', async () => {
      const input = {
        User: {
          group: ['department', 'role'],
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-string array group', async () => {
      const input = {
        User: {
          group: [1, 2, 3],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Order Validation', () => {
    it('should accept object order', async () => {
      const input = {
        User: {
          order: {
            name: 'asc',
            createdAt: 'desc',
          },
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept array order', async () => {
      const input = {
        User: {
          order: [
            { field: 'name', direction: 'asc' },
            { field: 'createdAt', direction: 'desc' },
          ],
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject invalid order direction', async () => {
      const input = {
        User: {
          order: { name: 'invalid' },
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject order array without field', async () => {
      const input = {
        User: {
          order: [{ direction: 'asc' }],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject order array without direction', async () => {
      const input = {
        User: {
          order: [{ field: 'name' }],
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Pagination Validation', () => {
    it('should accept valid limit', async () => {
      const input = {
        User: {
          limit: 10,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept valid offset', async () => {
      const input = {
        User: {
          offset: 10,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-number limit', async () => {
      const input = {
        User: {
          limit: 'invalid',
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject negative limit', async () => {
      const input = {
        User: {
          limit: -10,
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should accept zero limit', async () => {
      const input = {
        User: {
          limit: 0,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject limit exceeding max value', async () => {
      const input = {
        User: {
          limit: 1001,
        },
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should accept limit at max value', async () => {
      const input = {
        User: {
          limit: 1000,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept negative offset', async () => {
      const input = {
        User: {
          offset: -10,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept zero offset', async () => {
      const input = {
        User: {
          offset: 0,
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });
  });

  describe('Directive Validation', () => {
    it('should accept valid directives', async () => {
      const input = {
        User: { columns: ['id'] },
        '@method': 'GET',
        '@page': 1,
        '@limit': 10,
        '@offset': 0,
        '@cache': true,
        '@total': true,
        '@count': true,
        '@search': 'keyword',
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject unknown directive', async () => {
      const input = {
        User: { columns: ['id'] },
        '@unknownDirective': 'value',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid @method value', async () => {
      const input = {
        User: { columns: ['id'] },
        '@method': 'INVALID',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-string @method', async () => {
      const input = {
        User: { columns: ['id'] },
        '@method': 123,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-number @page', async () => {
      const input = {
        User: { columns: ['id'] },
        '@page': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject negative @page', async () => {
      const input = {
        User: { columns: ['id'] },
        '@page': -1,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject zero @page', async () => {
      const input = {
        User: { columns: ['id'] },
        '@page': 0,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-number @limit', async () => {
      const input = {
        User: { columns: ['id'] },
        '@limit': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject negative @limit', async () => {
      const input = {
        User: { columns: ['id'] },
        '@limit': -10,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject @limit exceeding max value', async () => {
      const input = {
        User: { columns: ['id'] },
        '@limit': 1001,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-number @offset', async () => {
      const input = {
        User: { columns: ['id'] },
        '@offset': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject negative @offset', async () => {
      const input = {
        User: { columns: ['id'] },
        '@offset': -10,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-string @search', async () => {
      const input = {
        User: { columns: ['id'] },
        '@search': 123,
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-boolean @cache', async () => {
      const input = {
        User: { columns: ['id'] },
        '@cache': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should accept boolean @cache', async () => {
      const input = {
        User: { columns: ['id'] },
        '@cache': true,
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should accept number @cache', async () => {
      const input = {
        User: { columns: ['id'] },
        '@cache': 300000,
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should reject non-boolean @total', async () => {
      const input = {
        User: { columns: ['id'] },
        '@total': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-boolean @count', async () => {
      const input = {
        User: { columns: ['id'] },
        '@count': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-boolean @schema', async () => {
      const input = {
        User: { columns: ['id'] },
        '@schema': 'invalid',
      };
      await expect(pipe.transform(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large request', async () => {
      const input: any = {};
      for (let i = 0; i < 100; i++) {
        input[`Table${i}`] = {
          columns: ['id', 'name'],
          where: { id: i },
          limit: 10,
        };
      }
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should handle deeply nested objects', async () => {
      const input = {
        User: {
          where: {
            $and: [
              {
                $or: [
                  { status: 'active' },
                  { status: 'pending' },
                ],
              },
              { age: { $gt: 18 } },
            ],
          },
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should handle special characters in values', async () => {
      const input = {
        User: {
          where: {
            name: "O'Brien",
            description: 'Test "quoted" string',
          },
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });

    it('should handle unicode characters', async () => {
      const input = {
        User: {
          where: {
            name: '你好世界 🌍',
          },
        },
      };
      const result = await pipe.transform(input);
      expect(result).toEqual(input);
    });
  });

  describe('Error Collection', () => {
    it('should collect multiple validation errors', async () => {
      const input = {
        '@InvalidTable': { columns: ['id'] },
        User: {
          columns: [1, 2, 3],
          where: 'invalid',
          joins: 'invalid',
          group: 123,
          order: 123,
          limit: -10,
          offset: -10,
        },
        '@method': 'INVALID',
        '@page': 'invalid',
      };

      try {
        await pipe.transform(input);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        const response = error.getResponse();
        expect(response.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return proper error structure', async () => {
      const input = 'invalid';

      try {
        await pipe.transform(input as any);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response).toMatchObject({
          status: 'error',
          code: 400,
          message: '请求体必须是对象',
          errors: expect.any(Array),
        });
      }
    });
  });
});
