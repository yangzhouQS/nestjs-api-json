import { vi } from 'vitest';

/**
 * 测试辅助工具函数
 * 提供通用的测试辅助方法和数据生成器
 */

/**
 * 创建模拟的APIJSON请求
 */
export function createMockAPIJSONRequest(
	overrides: Record<string, any> = {},
): Record<string, any> {
	return {
		User: {
			columns: [ 'id', 'name', 'email' ],
			where: { id: 1 },
			limit: 10,
			offset: 0,
		},
		...overrides,
	};
}

/**
 * 创建模拟的解析结果
 */
export function createMockParseResult(
	overrides: Record<string, any> = {},
): any {
	return {
		tables: {
			User: {
				name: 'User',
				columns: [ 'id', 'name', 'email' ],
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
		...overrides,
	};
}

/**
 * 创建模拟的验证结果
 */
export function createMockVerifyResult(
	overrides: Record<string, any> = {},
): any {
	return {
		valid: true,
		errors: [],
		warnings: [],
		tables: {},
		directives: {},
		original: {},
		...overrides,
	};
}

/**
 * 创建模拟的构建结果
 */
export function createMockBuildResult(
	overrides: Record<string, any> = {},
): any {
	return {
		queries: [
			{
				table: 'User',
				type: 'SELECT',
				columns: [ 'id', 'name', 'email' ],
				where: { id: 1 },
				joins: [],
				group: [],
				having: {},
				order: [],
				limit: 10,
				offset: 0,
				sql: 'SELECT id, name, email FROM User WHERE id = 1 LIMIT 10',
				params: [ 1 ],
			},
		],
		directives: {},
		original: {},
		...overrides,
	};
}

/**
 * 创建模拟的执行结果
 */
export function createMockExecuteResult(
	overrides: Record<string, any> = {},
): any {
	return {
		data: {
			User: {
				data: [
					{ id: 1, name: 'John Doe', email: 'john@example.com' },
				],
				total: 1,
				count: 1,
			},
		},
		directives: {},
		original: {},
		...overrides,
	};
}

/**
 * 创建模拟的APIJSON响应
 */
export function createMockAPIJSONResponse(
	overrides: Record<string, any> = {},
): any {
	return {
		status: 'success',
		code: 200,
		message: '请求成功',
		data: {},
		errors: [],
		warnings: [],
		processingTime: 0,
		timestamp: new Date().toISOString(),
		path: '/apijson',
		cached: false,
		...overrides,
	};
}

/**
 * 创建模拟的HTTP请求对象
 */
export function createMockRequest(
	overrides: Record<string, any> = {},
): any {
	return {
		method: 'POST',
		url: '/api/apijson',
		headers: {
			'content-type': 'application/json',
			'authorization': 'Bearer test-token',
			'user-agent': 'test-agent',
		},
		query: {},
		body: {},
		params: {},
		ip: '127.0.0.1',
		cookies: {},
		...overrides,
	};
}

/**
 * 创建模拟的HTTP响应对象
 */
export function createMockResponse(
	overrides: Record<string, any> = {},
): any {
	const response = {
		statusCode: 200,
		headers: {},
		body: null,
		status: function (code: number) {
			this.statusCode = code;
			return this;
		},
		json: function (data: any) {
			this.body = data;
			return this;
		},
		setHeader: function (name: string, value: string) {
			this.headers[name] = value;
			return this;
		},
		...overrides,
	};
	return response;
}

/**
 * 创建模拟的执行上下文
 */
export function createMockExecutionContext(
	overrides: Record<string, any> = {},
): any {
	return {
		switchToHttp: () => ({
			getRequest: () => createMockRequest(),
			getResponse: () => createMockResponse(),
		}),
		getHandler: () => ({}),
		getClass: () => ({}),
		...overrides,
	};
}

/**
 * 创建模拟的JWT payload
 */
export function createMockJWTPayload(
	overrides: Record<string, any> = {},
): any {
	return {
		sub: 'user-123',
		id: 'user-123',
		username: 'testuser',
		email: 'test@example.com',
		roles: [ 'user' ],
		permissions: [ 'read', 'write' ],
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		...overrides,
	};
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * 生成随机数字
 */
export function randomNumber(min: number = 0, max: number = 100): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机邮箱
 */
export function randomEmail(): string {
	return `test-${ randomString(8) }@example.com`;
}

/**
 * 生成随机日期
 */
export function randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建延迟的Promise
 */
export function createDelayedPromise<T>(value: T, delay: number = 100): Promise<T> {
	return new Promise(resolve => setTimeout(() => resolve(value), delay));
}

/**
 * 创建失败的Promise
 */
export function createRejectedPromise(error: Error | string): Promise<never> {
	const err = error instanceof Error ? error : new Error(error);
	return Promise.reject(err);
}

/**
 * 验证对象是否包含指定属性
 */
export function hasProperties(obj: any, properties: string[]): boolean {
	return properties.every(prop => prop in obj);
}

/**
 * 深度比较两个对象
 */
export function deepEqual(obj1: any, obj2: any): boolean {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
}
/*

/!**
 * 获取对象的差异
 *!/
export function getObjectDiff(obj1: any, obj2: any): any {
	const diff: any = {};
	const keys = new Set([ ...Object.keys(obj1), ...Object.keys(obj2) ]);

	keys.forEach(key => {
		if (!deepEqual(obj1[key], obj2[key])) {
			diff[key] = {
				old: obj1[key],
				new: obj2[key],
			};
		}
	});

	return diff;
}

/!**
 * Mock ConfigService
 *!/
export function createMockConfigService(config: Record<string, any> = {}) {
	return {
		get: vi.fn((key: string, defaultValue?: any) => {
			const keys = key.split('.');
			let value = config;
			for (const k of keys) {
				value = value?.[k];
			}
			return value !== undefined ? value : defaultValue;
		}),
		set: vi.fn(),
	};
}

/!**
 * Mock JwtService
 *!/
export function createMockJwtService() {
	return {
		sign: vi.fn((payload: any) => `mock-jwt-token-${ JSON.stringify(payload) }`),
		verify: vi.fn((token: string) => {
			if (token.startsWith('mock-jwt-token-')) {
				return JSON.parse(token.replace('mock-jwt-token-', ''));
			}
			throw new Error('Invalid token');
		}),
		decode: vi.fn(),
	};
}

/!**
 * Mock Reflector
 *!/
export function createMockReflector(metadata: Record<string, any> = {}) {
	return {
		get: vi.fn((key: any, handler: any) => metadata[key]),
		getAll: vi.fn((key: any) => metadata[key]),
		getAllAndOverride: vi.fn((key: any, defaultValue: any) => metadata[key] ?? defaultValue),
	};
}

/!**
 * Mock Logger
 *!/
export function createMockLogger() {
	return {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		verbose: vi.fn(),
	};
}

/!**
 * Mock CacheService
 *!/
export function createMockCacheService() {
	const cache = new Map();
	return {
		get: vi.fn(async (key: string) => cache.get(key) || null),
		set: vi.fn(async (key: string, value: any, ttl?: number) => {
			cache.set(key, { value, expiry: Date.now() + (ttl || 300000) });
		}),
		del: vi.fn(async (key: string) => cache.delete(key)),
		exists: vi.fn(async (key: string) => cache.has(key)),
		flush: vi.fn(async () => cache.clear()),
		getStats: vi.fn(async () => ({
			size: cache.size,
			maxSize: 1000,
			expiredCount: 0,
			totalSize: 0,
			hitRate: 0,
		})),
	};
}
*/

/**
 * Mock DatabaseService
 */
export function createMockDatabaseService() {
	return {
		query: vi.fn(async (sql: string, params: any[]) => ({
			rows: [],
			rowCount: 0,
		})),
		getTableSchema: vi.fn(async (tableName: string) => ({
			tableName,
			columns: [],
			indexes: [],
			foreignKeys: [],
		})),
		getTables: vi.fn(async () => []),
		close: vi.fn(async () => {
		}),
	};
}

/**
 * 创建测试数据生成器
 */
export class TestDataGenerator {
	/**
	 * 生成用户数据
	 */
	static user(overrides: Record<string, any> = {}) {
		return {
			id: randomNumber(1, 1000),
			name: `User ${ randomString(5) }`,
			email: randomEmail(),
			createdAt: randomDate(),
			updatedAt: new Date(),
			...overrides,
		};
	}

	/**
	 * 生成产品数据
	 */
	static product(overrides: Record<string, any> = {}) {
		return {
			id: randomNumber(1, 1000),
			name: `Product ${ randomString(5) }`,
			price: randomNumber(10, 1000),
			stock: randomNumber(0, 100),
			createdAt: randomDate(),
			...overrides,
		};
	}

	/**
	 * 生成订单数据
	 */
	static order(overrides: Record<string, any> = {}) {
		return {
			id: randomNumber(1, 1000),
			userId: randomNumber(1, 100),
			total: randomNumber(100, 10000),
			status: [ 'pending', 'completed', 'cancelled' ][randomNumber(0, 2)],
			createdAt: randomDate(),
			...overrides,
		};
	}

	/**
	 * 生成数据数组
	 */
	static array<T>(generator: () => T, count: number = 10): T[] {
		return Array.from({ length: count }, generator);
	}
}
