import { vi } from 'vitest';
import { testDbHelper } from './database/test-db-helper';

/**
 * Vitest测试环境设置文件
 * 在所有测试运行前执行
 */

// 加载测试环境变量
process.env.NODE_ENV = 'test';

// 设置时区
process.env.TZ = 'UTC';

// 全局测试超时设置
vi.setConfig({ testTimeout: 10000 });

// 检查是否使用真实数据库
const useRealDatabase = process.env.USE_REAL_DATABASE === 'true';

if (useRealDatabase) {
  // 使用真实数据库测试
  console.log('📊 使用真实MySQL数据库进行测试');
  
  // 初始化测试数据库
  beforeAll(async () => {
    try {
      await testDbHelper.initialize();
      const isConnected = await testDbHelper.testConnection();
      if (!isConnected) {
        throw new Error('数据库连接失败');
      }
      console.log('✓ 测试数据库初始化成功');
    } catch (error) {
      console.error('✗ 测试数据库初始化失败:', error);
      throw error;
    }
  });

  // 每个测试套件后清理数据
  afterEach(async () => {
    try {
      await testDbHelper.cleanupData();
    } catch (error) {
      console.error('✗ 清理测试数据失败:', error);
    }
  });

  // 所有测试后关闭数据库连接
  afterAll(async () => {
    try {
      await testDbHelper.close();
      console.log('✓ 测试数据库连接已关闭');
    } catch (error) {
      console.error('✗ 关闭测试数据库连接失败:', error);
    }
  });
} else {
  // 使用Mock数据库测试
  console.log('🎭 使用Mock数据库进行测试');
  
  // Mock console方法以减少测试输出噪音
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
}

// 导出测试数据库辅助类，供测试文件使用
global.testDbHelper = testDbHelper;
global.useRealDatabase = useRealDatabase;
