import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreParserService } from '@/modules/parser/core-parser.service';
import { MySQLBuilderService } from '@/modules/builder/mysql-builder.service';
import { MySQLExecutorService } from '@/modules/executor/mysql-executor.service';
import { DatabaseService } from '@/modules/database/database.service';

describe('批量插入返回完整记录测试', () => {
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

  it('应该正确解析批量插入请求', async () => {
    const request = {
      'user[]': [
        {
          name: '张三',
          age: 25,
        },
        {
          name: '李四',
          age: 26,
        },
      ],
    };

    const parseResult = await parserService.parse(request, 'POST');

    expect(parseResult.tables['user'].operation).toBe('INSERT');
    expect(parseResult.tables['user'].isArray).toBe(true);
    expect(Array.isArray(parseResult.tables['user'].data)).toBe(true);
    expect(parseResult.tables['user'].data.length).toBe(2);
    expect(parseResult.tables['user'].data[0].name).toBe('张三');
    expect(parseResult.tables['user'].data[1].name).toBe('李四');
  });

  it('应该正确构建批量插入SQL', async () => {
    const request = {
      'user[]': [
        {
          name: '张三',
          age: 25,
        },
        {
          name: '李四',
          age: 26,
        },
      ],
    };

    const parseResult = await parserService.parse(request, 'POST');
    const buildResult = await builderService.build(parseResult);

    expect(buildResult.queries.length).toBe(1);
    expect(buildResult.queries[0].operation).toBe('INSERT');
    expect(buildResult.queries[0].sql).toContain('INSERT INTO `user`');
    expect(buildResult.queries[0].sql).toContain('VALUES (?, ?), (?, ?)');
    
    // 参数应该包含所有插入的数据
    expect(buildResult.queries[0].params).toEqual(['张三', 25, '李四', 26]);
  });

  it('批量插入应该返回所有插入的完整记录', async () => {
    // 执行批量插入
    const request = {
      'user[]': [
        {
          name: '王五',
          age: 30,
        },
        {
          name: '赵六',
          age: 31,
        },
        {
          name: '孙七',
          age: 32,
        },
      ],
    };

    // 解析
    const parseResult = await parserService.parse(request, 'POST');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果：应该返回所有插入的完整记录
    expect(executeResult.data.user).toBeDefined();
    expect(executeResult.data.user.data).toBeDefined();
    expect(Array.isArray(executeResult.data.user.data)).toBe(true);
    expect(executeResult.data.user.data.length).toBe(3);

    // 验证每条记录都包含完整字段
    const records = executeResult.data.user.data;
    expect(records[0]).toHaveProperty('id');
    expect(records[0]).toHaveProperty('name');
    expect(records[0]).toHaveProperty('age');
    expect(records[0].name).toBe('王五');
    expect(records[0].age).toBe(30);

    expect(records[1]).toHaveProperty('id');
    expect(records[1]).toHaveProperty('name');
    expect(records[1]).toHaveProperty('age');
    expect(records[1].name).toBe('赵六');
    expect(records[1].age).toBe(31);

    expect(records[2]).toHaveProperty('id');
    expect(records[2]).toHaveProperty('name');
    expect(records[2]).toHaveProperty('age');
    expect(records[2].name).toBe('孙七');
    expect(records[2].age).toBe(32);

    // 验证ID是递增的
    expect(records[1].id).toBeGreaterThan(records[0].id);
    expect(records[2].id).toBeGreaterThan(records[1].id);

    // 清理测试数据
    const ids = records.map(r => r.id);
    await databaseService.query(
      `DELETE FROM \`user\` WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  });

  it('单条插入应该返回完整记录', async () => {
    // 执行单条插入
    const request = {
      user: {
        name: '周八',
        age: 33,
      },
    };

    // 解析
    const parseResult = await parserService.parse(request, 'POST');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果：应该返回插入的完整记录
    expect(executeResult.data.user).toBeDefined();
    expect(executeResult.data.user.data).toBeDefined();
    expect(Array.isArray(executeResult.data.user.data)).toBe(true);
    expect(executeResult.data.user.data.length).toBe(1);

    const record = executeResult.data.user.data[0];
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('name');
    expect(record).toHaveProperty('age');
    expect(record.name).toBe('周八');
    expect(record.age).toBe(33);

    // 清理测试数据
    await databaseService.query('DELETE FROM `user` WHERE id = ?', [record.id]);
  });

  it('批量插入应该正确处理大量数据', async () => {
    // 创建大量测试数据
    const batchSize = 10;
    const testData = [];
    for (let i = 0; i < batchSize; i++) {
      testData.push({
        name: `用户${i}`,
        age: 20 + i,
      });
    }

    // 执行批量插入
    const request = {
      'user[]': testData,
    };

    // 解析
    const parseResult = await parserService.parse(request, 'POST');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果
    expect(executeResult.data.user.data.length).toBe(batchSize);

    // 验证每条记录
    for (let i = 0; i < batchSize; i++) {
      const record = executeResult.data.user.data[i];
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('name');
      expect(record).toHaveProperty('age');
      expect(record.name).toBe(`用户${i}`);
      expect(record.age).toBe(20 + i);
    }

    // 清理测试数据
    const ids = executeResult.data.user.data.map(r => r.id);
    await databaseService.query(
      `DELETE FROM \`user\` WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  });

  it('批量插入应该保持插入顺序', async () => {
    // 执行批量插入
    const request = {
      'user[]': [
        {
          name: '第一个',
          age: 1,
        },
        {
          name: '第二个',
          age: 2,
        },
        {
          name: '第三个',
          age: 3,
        },
      ],
    };

    // 解析
    const parseResult = await parserService.parse(request, 'POST');
    
    // 构建
    const buildResult = await builderService.build(parseResult);

    // 执行
    const executeResult = await executorService.execute(buildResult);

    // 验证执行结果：应该保持插入顺序
    const records = executeResult.data.user.data;
    expect(records[0].name).toBe('第一个');
    expect(records[1].name).toBe('第二个');
    expect(records[2].name).toBe('第三个');

    // 清理测试数据
    const ids = records.map(r => r.id);
    await databaseService.query(
      `DELETE FROM \`user\` WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  });
});
