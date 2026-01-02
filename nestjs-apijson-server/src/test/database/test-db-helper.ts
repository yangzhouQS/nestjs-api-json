import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试数据库辅助类
 * 用于管理测试数据库的初始化、清理和连接
 */
export class TestDatabaseHelper {
  private static instance: TestDatabaseHelper;
  private pool: mysql.Pool | null = null;
  private config: mysql.ConnectionOptions;

  private constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'apijson_test',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TestDatabaseHelper {
    if (!TestDatabaseHelper.instance) {
      TestDatabaseHelper.instance = new TestDatabaseHelper();
    }
    return TestDatabaseHelper.instance;
  }

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      // 首先连接到MySQL服务器（不指定数据库）
      const serverConnection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
      });

      // 创建测试数据库
      await serverConnection.query(
        `CREATE DATABASE IF NOT EXISTS ${this.config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await serverConnection.end();

      // 创建连接池
      this.pool = mysql.createPool(this.config);
      console.log(`✓ 测试数据库连接已建立: ${this.config.database}`);

      // 初始化数据库结构
      await this.initializeSchema();
    } catch (error) {
      console.error('✗ 测试数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库结构
   */
  private async initializeSchema(): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    try {
      // 读取并执行初始化脚本
      const initScriptPath = path.join(__dirname, 'init-test-db.sql');
      if (fs.existsSync(initScriptPath)) {
        const sql = fs.readFileSync(initScriptPath, 'utf8');
        await this.executeScript(sql);
        console.log('✓ 数据库结构初始化完成');
      } else {
        console.warn('⚠ 初始化脚本未找到，跳过数据库结构初始化');
      }
    } catch (error) {
      console.error('✗ 数据库结构初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行SQL脚本
   */
  private async executeScript(sql: string): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    // 分割SQL语句（按分号分割，忽略注释中的分号）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      try {
        await this.pool.query(statement);
      } catch (error) {
        // 忽略已存在的错误
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupData(): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    try {
      // 调用存储过程清理数据
      await this.pool.query('CALL clean_test_data()');
      console.log('✓ 测试数据已清理');
    } catch (error) {
      console.error('✗ 清理测试数据失败:', error);
      // 如果存储过程不存在，手动清理
      await this.manualCleanup();
    }
  }

  /**
   * 手动清理测试数据
   */
  private async manualCleanup(): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    const tables = ['logins', 'verifies', 'comments', 'moments', 'user_roles', 'users', 'roles'];
    
    for (const table of tables) {
      try {
        await this.pool.query(`DELETE FROM ${table}`);
        await this.pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (error) {
        // 忽略表不存在的错误
        if (!error.message.includes("doesn't exist")) {
          console.warn(`清理表 ${table} 失败:`, error.message);
        }
      }
    }

    // 重新插入基础数据
    await this.insertBaseData();
  }

  /**
   * 插入基础测试数据
   */
  private async insertBaseData(): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    // 插入角色
    await this.pool.query(`
      INSERT INTO roles (name, description) VALUES
      ('admin', '管理员角色'),
      ('user', '普通用户角色'),
      ('guest', '访客角色')
    `);

    // 插入用户
    await this.pool.query(`
      INSERT INTO users (name, email, age, gender, phone, address) VALUES
      ('Alice', 'alice@example.com', 25, 'female', '13800138001', '北京市朝阳区'),
      ('Bob', 'bob@example.com', 30, 'male', '13800138002', '上海市浦东新区'),
      ('Charlie', 'charlie@example.com', 28, 'male', '13800138003', '广州市天河区'),
      ('David', 'david@example.com', 35, 'male', '13800138004', '深圳市南山区'),
      ('Eve', 'eve@example.com', 27, 'female', '13800138005', '杭州市西湖区')
    `);

    // 插入用户角色关联
    await this.pool.query(`
      INSERT INTO user_roles (user_id, role_id) VALUES
      (1, 2), (2, 1), (2, 2), (3, 2), (4, 1), (4, 2), (5, 2)
    `);

    // 插入动态
    await this.pool.query(`
      INSERT INTO moments (user_id, content, picture_list) VALUES
      (1, '今天天气真好！', NULL),
      (2, '分享一张照片', '["https://example.com/photo1.jpg"]'),
      (3, '学习了新技能', NULL),
      (4, '周末去爬山', NULL),
      (5, '美食分享', '["https://example.com/food1.jpg", "https://example.com/food2.jpg"]')
    `);

    // 插入评论
    await this.pool.query(`
      INSERT INTO comments (user_id, content, moment_id) VALUES
      (2, '很棒！', 1),
      (3, '我也想去', 4),
      (4, '看起来不错', 5),
      (5, '赞同', 1),
      (1, '谢谢大家的支持', 1)
    `);
  }

  /**
   * 执行查询
   */
  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    const [rows, fields] = await this.pool.query(sql, params);
    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      fields: fields || [],
    };
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }
    return await this.pool.getConnection();
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        console.log('✓ 测试数据库连接已关闭');
      } catch (error) {
        console.error('✗ 关闭测试数据库连接失败:', error);
        throw error;
      }
    }
  }

  /**
   * 重置数据库（删除并重新创建）
   */
  async resetDatabase(): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    try {
      const dbName = this.config.database as string;
      
      // 关闭当前连接池
      await this.pool.end();
      this.pool = null;

      // 连接到MySQL服务器
      const serverConnection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
      });

      // 删除并重新创建数据库
      await serverConnection.query(`DROP DATABASE IF EXISTS ${dbName}`);
      await serverConnection.query(
        `CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await serverConnection.end();

      // 重新初始化连接
      await this.initialize();
    } catch (error) {
      console.error('✗ 重置数据库失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('✗ 数据库连接测试失败:', error);
      return false;
    }
  }
}

/**
 * 导出单例实例
 */
export const testDbHelper = TestDatabaseHelper.getInstance();
