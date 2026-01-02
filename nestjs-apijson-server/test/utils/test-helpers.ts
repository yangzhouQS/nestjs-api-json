/**
 * 测试辅助工具
 * 提供测试中常用的辅助函数
 */

/**
 * 创建测试用户数据
 */
export function createTestUser(overrides = {}) {
  return {
    name: '测试用户',
    age: 25,
    email: 'test@example.com',
    ...overrides,
  };
}

/**
 * 创建测试评论数据
 */
export function createTestComment(overrides = {}) {
  return {
    userId: 1,
    content: '测试评论',
    ...overrides,
  };
}

/**
 * 创建测试动态数据
 */
export function createTestMoment(overrides = {}) {
  return {
    userId: 1,
    content: '测试动态',
    ...overrides,
  };
}

/**
 * 创建 APIJSON GET 请求
 */
export function createGetRequest(tableName: string, where: any = {}) {
  return {
    [tableName]: where,
  };
}

/**
 * 创建 APIJSON GETS 请求
 */
export function createGetsRequest(tableName: string, where: any = {}) {
  return {
    [`${tableName}[]`]: where,
  };
}

/**
 * 创建 APIJSON POST 请求
 */
export function createPostRequest(tableName: string, data: any) {
  return {
    [tableName]: data,
  };
}

/**
 * 创建 APIJSON PUT 请求
 */
export function createPutRequest(tableName: string, id: number, data: any) {
  return {
    [tableName]: {
      id,
      ...data,
    },
  };
}

/**
 * 创建 APIJSON DELETE 请求
 */
export function createDeleteRequest(tableName: string, where: any) {
  return {
    [tableName]: where,
  };
}

/**
 * 创建 APIJSON CRUD 请求
 */
export function createCrudRequest(operations: any[]) {
  const request: any = {};
  for (const op of operations) {
    const key = op.isArray ? `${op.tableName}[]` : op.tableName;
    request[key] = op.data;
  }
  return request;
}

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length = 10): string {
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
export function randomNumber(min = 1, max = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机邮箱
 */
export function randomEmail(): string {
  return `test${randomString(8)}@example.com`;
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(app: any, tableName: string, where: any) {
  // 这里可以添加清理测试数据的逻辑
  // 例如：调用 DELETE API 删除测试数据
}

/**
 * 验证 APIJSON 响应格式
 */
export function expectAPIJSONResponse(response: any, expectedCode = 200) {
  expect(response).toHaveProperty('code', expectedCode);
  expect(response).toHaveProperty('message');
  expect(response).toHaveProperty('data');
}

/**
 * 验证错误响应
 */
export function expectErrorResponse(response: any, expectedCode = 400) {
  expect(response).toHaveProperty('code', expectedCode);
  expect(response).toHaveProperty('message');
  expect(response).toHaveProperty('errors');
}
