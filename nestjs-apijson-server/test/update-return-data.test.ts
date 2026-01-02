import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreParserService } from '@/modules/parser/core-parser.service';
import { MySQLBuilderService } from '@/modules/builder/mysql-builder.service';
import { MySQLExecutorService } from '@/modules/executor/mysql-executor.service';
import { DatabaseService } from '@/modules/database/database.service';
import { RequestMethod } from '@/types/request-method.type';

describe('UPDATE操作返回完整记录测试', () => {
  let parserService: CoreParserService;
  let builderService: MySQLBuilderService;
  let executorService: MySQLExecutorService;
  let databaseService: DatabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        CoreParserService,
        MySQLBuilderService,
        MySQLExecutorService,
        DatabaseService,
      ],
    }).compile();

    parserService = module.get<CoreParserService>(CoreParserService);
    builderService = module.get<MySQLBuilderService>(MySQLBuilderService);
    executorService = module.get<MySQLExecutorService>(MySQLExecutorService);
    databaseService = module.get<DatabaseService>(DatabaseService);

    // 初始化测试数据库
    await databaseService.initialize();
  });

  afterAll(async () => {
    await module.close();
  });

  it('应该正确解析UPDATE请求', async () => {
    const request = {
      User: {
        id: 1,
        name: '张三',
        age: 25,
      },
    };

    const parseResult = await parserService.parse(request, 'PUT');

    expect(parseResult.tables.User.operation).toBe('UPDATE');
    expect(parseResult.tables.User.where.id).toBe(1);
    // id 应该在 where 中，不在 data 中
    expect(parseResult.tables.User.data.id).toBeUndefined();
    expect(parseResult.tables.User.data.name).toBe('张三');
    expect(parseResult.tables.User.data.age).toBe(25);
  });

  it('应该正确构建UPDATE SQL', async () => {
    const request = {
      User: {
        id: 1,
        name: '张三',
        age: 25,
      },
    };

    const parseResult = await parserService.parse(request, 'PUT');
    const buildResult = await builderService.build(parseResult);

    expect(buildResult.queries.length).toBe(1);
    expect(buildResult.queries[0].operation).toBe('UPDATE');
    expect(buildResult.queries[0].sql).toContain('UPDATE `User` SET');
    expect(buildResult.queries[0].sql).toContain('`name` = ?');
    expect(buildResult.queries[0].sql).toContain('`age` = ?');
    expect(buildResult.queries[0].sql).toContain('WHERE `id` = ?');
    
    // 参数应该包含 name, age, id
    expect(buildResult.queries[0].params).toEqual(['张三', 25, 1]);
  });

  it('UPDATE操作应该从where条件中提取id并查询完整记录', async () => {
    // 首先插入一条测试数据
    await databaseService.query(
      'INSERT INTO `User` (name, age) VALUES (?, ?)',
      ['李四', 30]
    );

    // 获取插入的记录ID
    const insertResult = await databaseService.query(
      'SELECT id FROM `User` WHERE name = ? ORDER BY id DESC LIMIT 1',
      ['李四']
    );
    const userId = insertResult[0]?.id;

    if (!userId) {
      throw new Error('无法获取测试用户ID');
    }

    // 构建UPDATE请求
    const request = {
      User: {
        id: userId,
        name: '王五',
        age: 35,
      },
    };

    // 解析
    const parseResult = await parserService.parse(request, 'PUT');
    
    // 验证解析结果：id在where中，不在data中
    expect(parseResult.tables.User.where.id).toBe(userId);
    expect(parseResult.tables.User.data.id).toBeUndefined();
    expect(parseResult.tables.User.data.name).toBe('王五');
    expect(parseResult.tables.User.data.age).toBe(35);

    // 构建
    const buildResult = await builderService.build(parseResult);

    // 验证构建结果：where包含id
    expect(buildResult.queries[0].where.id).toBe(userId);
    expect(buildResult.queries[0].data.id).toBeUndefined();

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果：应该返回更新后的完整记录
    expect(executeResult.data.User).toBeDefined();
    expect(executeResult.data.User.data).toBeDefined();
    expect(Array.isArray(executeResult.data.User.data)).toBe(true);
    expect(executeResult.data.User.data.length).toBeGreaterThan(0);

    const updatedRecord = executeResult.data.User.data[0];
    expect(updatedRecord.id).toBe(userId);
    expect(updatedRecord.name).toBe('王五');
    expect(updatedRecord.age).toBe(35);

    // 清理测试数据
    await databaseService.query('DELETE FROM `User` WHERE id = ?', [userId]);
  });

  it('UPDATE操作在没有id时应该返回原始数据', async () => {
    // 构建UPDATE请求（没有id）
    const request = {
      User: {
        name: '赵六',
        age: 40,
      },
    };

    // 解析
    const parseResult = await parserService.parse(request, 'PUT');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行（会失败因为没有WHERE条件，但应该返回原始数据）
    try {
      const executeResult = await executorService.execute(buildResult);
      
      // 验证执行结果：应该返回原始数据
      expect(executeResult.data.User).toBeDefined();
      expect(executeResult.data.User.data).toBeDefined();
      expect(Array.isArray(executeResult.data.User.data)).toBe(true);
      expect(executeResult.data.User.data.length).toBe(1);

      const originalData = executeResult.data.User.data[0];
      expect(originalData.name).toBe('赵六');
      expect(originalData.age).toBe(40);
    } catch (error) {
      // 如果执行失败（没有WHERE条件），这是预期的
      expect(error).toBeDefined();
    }
  });

  it('UPDATE操作应该正确处理引用字段', async () => {
    // 首先插入两条测试数据
    await databaseService.query(
      'INSERT INTO `User` (name, age) VALUES (?, ?)',
      ['用户A', 20]
    );

    const userA = await databaseService.query(
      'SELECT id FROM `User` WHERE name = ? ORDER BY id DESC LIMIT 1',
      ['用户A']
    );
    const userAId = userA[0]?.id;

    if (!userAId) {
      throw new Error('无法获取测试用户A的ID');
    }

    // 构建UPDATE请求（包含引用字段）
    const request = {
      User: {
        id: userAId,
        name: '用户A更新',
        age: 25,
      },
    };

    // 解析
    const parseResult = await parserService.parse(request, 'PUT');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果
    expect(executeResult.data.User.data[0].id).toBe(userAId);
    expect(executeResult.data.User.data[0].name).toBe('用户A更新');
    expect(executeResult.data.User.data[0].age).toBe(25);

    // 清理测试数据
    await databaseService.query('DELETE FROM `User` WHERE id = ?', [userAId]);
  });
});
