import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '@/modules/database/database.service';
import $lodash from 'lodash'
import $mockjs from 'mockjs'

/**
 * 测试数据库控制器
 * 用于验证数据库连接和查询是否正常工作
 */
@ApiTags('Database Test')
@Controller('test-database')
export class TestDatabaseController {
  private readonly logger = new Logger(TestDatabaseController.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 测试数据库连接
   */
  @Get('connection')
  @ApiOperation({
    summary: '测试数据库连接',
    description: '测试数据库连接是否正常',
  })
  @ApiResponse({
    status: 200,
    description: '连接测试结果',
  })
  async testConnection() {
    this.logger.log('开始测试数据库连接');

    try {
      const isConnected = await this.databaseService.testConnection();
      const version = await this.databaseService.getDatabaseVersion();

      this.logger.log(`数据库连接测试结果: connected=${isConnected}, version=${version}`);

      return {
        success: true,
        connected: isConnected,
        version,
        message: isConnected ? '数据库连接正常' : '数据库连接失败',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`数据库连接测试失败: ${error.message}`, error.stack);

      return {
        success: false,
        connected: false,
        version: 'unknown',
        message: `数据库连接失败: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 测试数据库查询
   */
  @Get('query')
  @ApiOperation({
    summary: '测试数据库查询',
    description: '执行一个简单的 SELECT 1 查询',
  })
  @ApiResponse({
    status: 200,
    description: '查询测试结果',
  })
  async testQuery() {
    this.logger.log('开始测试数据库查询');

    try {
      const result = await this.databaseService.query('show tables');

      this.logger.log(`数据库查询测试结果: ${JSON.stringify(result)}`);

      return {
        success: true,
        result: result.rows,
        message: '数据库查询正常',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`数据库查询测试失败: ${error.message}`, error.stack);

      return {
        success: false,
        result: null,
        message: `数据库查询失败: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 测试 User 表查询
   */
  @Get('user-table')
  @ApiOperation({
    summary: '测试 User 表查询',
    description: '查询 User 表是否存在以及表中的数据',
  })
  @ApiResponse({
    status: 200,
    description: 'User 表查询结果',
  })
  async testUserTable() {
    this.logger.log('开始测试 User 表查询');

    try {
      // 检查表是否存在
      const tables = await this.databaseService.getTables();
      const userTableExists = tables.includes('user');

      this.logger.log(`User 表是否存在: ${userTableExists}`);
      this.logger.log(`所有表: ${JSON.stringify(tables)}`);

      if (!userTableExists) {
        return {
          success: false,
          tableExists: false,
          data: [],
          message: 'User 表不存在',
          allTables: tables,
          timestamp: new Date().toISOString(),
        };
      }

      // 查询 User 表数据
      const result = await this.databaseService.query('SELECT * FROM `user` LIMIT 5');

      this.logger.log(`User 表数据: ${JSON.stringify(result)}`);

      return {
        success: true,
        tableExists: true,
        data: result.rows || [],
        message: 'User 表查询成功',
        rowCount: result.rowCount || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`User 表查询测试失败: ${error.message}`, error.stack);

      return {
        success: false,
        tableExists: false,
        data: [],
        message: `User 表查询失败: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 测试 User 表结构
   */
  @Get('user-schema')
  @ApiOperation({
    summary: '测试 User 表结构',
    description: '查询 User 表的结构信息',
  })
  @ApiResponse({
    status: 200,
    description: 'User 表结构',
  })
  async testUserSchema() {
    this.logger.log('开始测试 User 表结构');

    try {
      const schema = await this.databaseService.getTableSchema('user');

      this.logger.log(`User 表结构: ${JSON.stringify(schema)}`);

      return {
        success: true,
        schema,
        message: 'User 表结构查询成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`User 表结构查询失败: ${error.message}`, error.stack);

      return {
        success: false,
        schema: null,
        message: `User 表结构查询失败: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 测试插入数据
   */
  @Get('insert-test')
  @ApiOperation({
    summary: '测试插入数据',
    description: '向 User 表插入一条测试数据',
  })
  @ApiResponse({
    status: 200,
    description: '插入测试结果',
  })
  async testInsert() {
    this.logger.log('开始测试插入数据');

    try {
      const testId = Date.now();
      const testName = $mockjs.Random.cname();
      const age = $mockjs.Random.integer(12,45);
      const email = $mockjs.Random.email();
      console.log(testName, age,email,);

      const result = await this.databaseService.query(
        'INSERT INTO `user` (`name`, `age`, email) VALUES (?, ?, ?)',
        [testName, age, email]
      );

      this.logger.log(`插入数据结果: ${JSON.stringify(result)}`);
      console.log($mockjs.Random.cname());
      return {
        success: true,
        insertId: result.insertId || result.rows?.[0]?.insertId,
        data: { id: testId, name: testName, age: age },
        message: '数据插入成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`插入数据测试失败: ${error.message}`, error.stack);

      return {
        success: false,
        insertId: null,
        data: null,
        message: `数据插入失败: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
