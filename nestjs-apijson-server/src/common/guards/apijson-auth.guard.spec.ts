import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIJSONAuthGuard } from './apijson-auth.guard';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { APIJSONAuth } from '@/common/decorators/apijson.decorator';

describe('APIJSONAuthGuard', () => {
  let guard: APIJSONAuthGuard;
  let mockReflector: Reflector;
  let mockJwtService: JwtService;

  beforeEach(() => {
    mockReflector = {
      get: vi.fn(),
      getAll: vi.fn(),
      getAllAndOverride: vi.fn(),
    } as any;

    mockJwtService = {
      verify: vi.fn(),
      sign: vi.fn(),
      decode: vi.fn(),
    } as any;

    guard = new APIJSONAuthGuard(mockReflector, mockJwtService);
  });

  const createMockExecutionContext = (
    handlerMetadata: any = {},
    request: any = {}
  ): ExecutionContext => {
    const mockRequest = {
      headers: {},
      query: {},
      cookies: {},
      ...request,
    };

    const mockResponse = {
      setHeader: vi.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => handlerMetadata,
      getClass: () => ({}),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when auth is disabled', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: false },
      };

      mockReflector.get = vi.fn((key, handler) => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // The actual call passes the handler function as the second argument
      expect(mockReflector.get).toHaveBeenCalledWith(APIJSONAuth, context.getHandler());
    });

    it('should allow access when skip is true', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, skip: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no auth config is present', async () => {
      mockReflector.get = vi.fn(() => undefined);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with proper error structure when no token', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata);

      try {
        await guard.canActivate(context);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = error.getResponse();
        expect(response).toMatchObject({
          status: 'error',
          code: 401,
          message: '未提供认证令牌',
          errors: expect.any(Array),
        });
      }
    });
  });

  describe('Token Extraction', () => {
    it('should extract token from Authorization header', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should extract token from query parameter', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        query: {
          token: 'valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should extract token from cookie', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        cookies: {
          token: 'valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should prioritize Authorization header over other sources', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer header-token',
        },
        query: {
          token: 'query-token',
        },
        cookies: {
          token: 'cookie-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('header-token');
    });

    it('should prioritize query parameter over cookie', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        query: {
          token: 'query-token',
        },
        cookies: {
          token: 'cookie-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('query-token');
    });
  });

  describe('Token Validation', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => {
        throw new Error('Invalid token');
      });

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with proper error structure for invalid token', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => {
        throw new Error('Token expired');
      });

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      try {
        await guard.canActivate(context);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = error.getResponse();
        expect(response).toMatchObject({
          status: 'error',
          code: 401,
          message: '认证令牌无效',
          errors: expect.any(Array),
        });
      }
    });

    it('should add user to request object when token is valid', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      const payload = {
        sub: 'user-123',
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read', 'write'],
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => payload);

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(payload);
    });
  });

  describe('Role Validation', () => {
    it('should allow access when user has required role', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['admin', 'user'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of required roles', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin', 'moderator'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['moderator'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with proper error structure for missing role', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      try {
        await guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = error.getResponse();
        expect(response).toMatchObject({
          status: 'error',
          code: 403,
          message: '权限不足',
          errors: expect.any(Array),
        });
      }
    });

    it('should allow access when no roles are required', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle empty roles array', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: [] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle user without roles', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Permission Validation', () => {
    it('should allow access when user has required permission', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['read', 'write', 'delete'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of required permissions', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: ['write', 'delete'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['delete'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['read'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with proper error structure for missing permission', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['read'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      try {
        await guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = error.getResponse();
        expect(response).toMatchObject({
          status: 'error',
          code: 403,
          message: '权限不足',
          errors: expect.any(Array),
        });
      }
    });

    it('should allow access when no permissions are required', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['read'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle empty permissions array', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: [] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        permissions: ['read'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle user without permissions', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Response Headers', () => {
    it('should set X-Authenticated header', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith('X-Authenticated', 'true');
    });

    it('should set X-User-ID header with sub', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith('X-User-ID', 'user-123');
    });

    it('should set X-User-ID header with id when sub is not present', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        id: 'user-456',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith('X-User-ID', 'user-456');
    });
  });

  describe('Combined Validation', () => {
    it('should validate both roles and permissions', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'], permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['admin'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject when role validation fails', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'], permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should reject when permission validation fails', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: ['admin'], permissions: ['write'] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
        roles: ['admin'],
        permissions: ['read'],
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed Authorization header', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty Authorization header', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: '',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Authorization header with only Bearer', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer',
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle token with special characters', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer token-with-special-chars!@#$%',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle very long token', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const longToken = 'a'.repeat(10000);
      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: `Bearer ${longToken}`,
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith(longToken);
    });

    it('should handle empty roles and permissions', async () => {
      const handlerMetadata = {
        [APIJSONAuth]: { enabled: true, roles: [], permissions: [] },
      };

      mockReflector.get = vi.fn(() => handlerMetadata[APIJSONAuth]);
      mockJwtService.verify = vi.fn(() => ({
        sub: 'user-123',
      }));

      const context = createMockExecutionContext(handlerMetadata, {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
