# UPDATE操作返回完整记录修复说明

## 问题描述

在执行UPDATE操作后，返回结果为`null`或不完整，无法获取更新后的完整记录数据。

## 问题根因

### 1. 解析器行为

在 [`core-parser.service.ts`](../src/modules/parser/core-parser.service.ts:141-187) 中，UPDATE操作的解析逻辑如下：

```typescript
if (operation === TableOperation.UPDATE) {
  const updateData: any = {};
  const whereConditions: any = {};
  
  for (const [key, value] of Object.entries(tableData)) {
    if (key === 'id') {
      whereConditions[key] = value;  // id 放入 where 条件
    } else {
      updateData[key] = value;        // 其他字段放入 data
    }
  }
  
  return {
    data: updateData,  // 不包含 id
    where: whereConditions,  // 包含 id
  };
}
```

**关键点**：解析器将 `id` 从 `data` 中分离，放入 `where` 条件中。

### 2. 执行器问题

在 [`mysql-executor.service.ts`](../src/modules/executor/mysql-executor.service.ts:310) 的原始实现中：

```typescript
// 单条更新，查询更新后的完整记录
if (query.data && query.data.id) {  // ❌ 检查 query.data.id
  try {
    const updatedData = await this.queryUpdatedRecord(query.table, query.data.id);
    return {
      data: updatedData,
      total: 1,
      count: 1,
    };
  } catch (error) {
    // ...
  }
}

// 返回原始数据
return {
  data: [query.data],  // ❌ data 中没有 id，返回不完整
  total: 1,
  count: 1,
};
```

**问题**：
- 执行器检查 `query.data.id`，但由于解析器已将 `id` 移至 `where`，所以 `query.data.id` 为 `undefined`
- 导致不会查询更新后的完整记录
- 最终返回的 `data` 不包含 `id` 字段

## 解决方案

修改 [`mysql-executor.service.ts`](../src/modules/executor/mysql-executor.service.ts:290-335) 的 `executeUpdate` 方法：

```typescript
private async executeUpdate(query: Query): Promise<QueryExecuteResult> {
  this.logger.debug(`执行 UPDATE 查询: ${query.table}`);

  const result = await this.databaseService.query(query.sql, query.params);
  const affectedRows = this.extractAffectedRows(result);

  // 如果是批量更新，返回更新后的数据
  if (Array.isArray(query.data)) {
    return {
      data: query.data,
      total: query.data.length,
      count: query.data.length,
    };
  }

  // 单条更新，查询更新后的完整记录
  // ✅ 从 where 条件中提取 id（因为解析器将 id 从 data 中分离到 where）
  let recordId: number | undefined;
  
  // 优先从 where 条件中查找 id
  if (query.where && query.where.id !== undefined) {
    recordId = query.where.id;
  }
  // 如果 where 中没有，尝试从 data 中查找
  else if (query.data && query.data.id !== undefined) {
    recordId = query.data.id;
  }

  if (recordId !== undefined) {
    try {
      const updatedData = await this.queryUpdatedRecord(query.table, recordId);
      return {
        data: updatedData,
        total: 1,
        count: 1,
      };
    } catch (error) {
      this.logger.error(`查询更新后的记录失败: ${error.message}`, error.stack);
      // 如果查询失败，返回原始数据
      return {
        data: [query.data],
        total: 1,
        count: 1,
      };
    }
  }

  // 单条更新，没有 id，返回原始数据
  return {
    data: [query.data],
    total: 1,
    count: 1,
  };
}
```

**关键改进**：
1. ✅ 优先从 `query.where.id` 中提取记录ID
2. ✅ 兼容从 `query.data.id` 中提取（保持向后兼容）
3. ✅ 成功查询后返回更新后的完整记录
4. ✅ 查询失败时返回原始数据（降级处理）

## 测试用例

创建了完整的测试文件 [`update-return-data.test.ts`](../test/update-return-data.test.ts)，包含以下测试场景：

### 1. 解析器测试
```typescript
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
  expect(parseResult.tables.User.where.id).toBe(1);  // ✅ id 在 where 中
  expect(parseResult.tables.User.data.id).toBeUndefined();  // ✅ id 不在 data 中
  expect(parseResult.tables.User.data.name).toBe('张三');
  expect(parseResult.tables.User.data.age).toBe(25);
});
```

### 2. 构建器测试
```typescript
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

  expect(buildResult.queries[0].sql).toContain('UPDATE `User` SET');
  expect(buildResult.queries[0].sql).toContain('WHERE `id` = ?');
  expect(buildResult.queries[0].params).toEqual(['张三', 25, 1]);
});
```

### 3. 执行器集成测试
```typescript
it('UPDATE操作应该从where条件中提取id并查询完整记录', async () => {
  // 插入测试数据
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

  // 执行UPDATE
  const request = {
    User: {
      id: userId,
      name: '王五',
      age: 35,
    },
  };

  const parseResult = await parserService.parse(request, 'PUT');
  const buildResult = await builderService.build(parseResult);
  const executeResult = await executorService.execute(buildResult);

  // ✅ 验证返回更新后的完整记录
  expect(executeResult.data.User.data[0].id).toBe(userId);
  expect(executeResult.data.User.data[0].name).toBe('王五');
  expect(executeResult.data.User.data[0].age).toBe(35);
});
```

## 影响范围

### 修改文件
- [`src/modules/executor/mysql-executor.service.ts`](../src/modules/executor/mysql-executor.service.ts)

### 新增文件
- [`test/update-return-data.test.ts`](../test/update-return-data.test.ts)

### 依赖模块
- [`src/modules/parser/core-parser.service.ts`](../src/modules/parser/core-parser.service.ts) - 解析器行为（未修改）
- [`src/modules/builder/mysql-builder.service.ts`](../src/modules/builder/mysql-builder.service.ts) - 构建器行为（未修改）

## 使用示例

### 修复前（返回不完整）
```json
// 请求
{
  "User": {
    "id": 1,
    "name": "张三",
    "age": 25
  }
}

// 响应（❌ 不完整，缺少 id）
{
  "code": 200,
  "msg": "success",
  "User": {
    "data": [
      {
        "name": "张三",
        "age": 25
        // ❌ 缺少 id
      }
    ]
  }
}
```

### 修复后（返回完整）
```json
// 请求
{
  "User": {
    "id": 1,
    "name": "张三",
    "age": 25
  }
}

// 响应（✅ 完整，包含 id）
{
  "code": 200,
  "msg": "success",
  "User": {
    "data": [
      {
        "id": 1,
        "name": "张三",
        "age": 25
        // ✅ 包含 id 和所有字段
      }
    ]
  }
}
```

## 兼容性说明

- ✅ **向后兼容**：如果 `query.data.id` 存在，仍然会优先使用
- ✅ **向前兼容**：如果 `query.where.id` 存在，会正确使用
- ✅ **降级处理**：查询失败时返回原始数据，不会导致错误

## 相关文档

- [UPDATE语句WHERE条件拼接修复说明](./UPDATE语句WHERE条件拼接修复说明.md)
- [插入数据返回完整记录修复说明](./插入数据返回完整记录修复说明.md)
- [MySQL-ResultSetHeader-解析修复说明](./MySQL-ResultSetHeader-解析修复说明.md)

## 总结

本次修复解决了UPDATE操作返回结果不完整的问题。核心改进是：

1. **理解解析器行为**：解析器将 `id` 从 `data` 分离到 `where`
2. **修正执行器逻辑**：从 `where` 中提取 `id` 来查询更新后的记录
3. **保持兼容性**：同时支持从 `data` 和 `where` 中提取 `id`
4. **完善测试覆盖**：添加完整的单元测试和集成测试

修复后，UPDATE操作能够正确返回更新后的完整记录，包括所有字段和自动生成的值（如 `update_time` 等）。
