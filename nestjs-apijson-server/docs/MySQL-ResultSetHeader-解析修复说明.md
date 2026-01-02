# MySQL ResultSetHeader 解析修复说明

## 问题描述

在执行 INSERT、UPDATE、DELETE 等 SQL 操作时，MySQL 返回的是 `ResultSetHeader` 对象，但之前的代码试图将其包装成 `{ rows, rowCount, fields }` 格式，导致无法正确解析和使用。

### 错误的返回格式

```javascript
ResultSetHeader {
  fieldCount: 0,
  affectedRows: 1,
  insertId: 20,
  info: '',
  serverStatus: 2,
  warningStatus: 0,
  changedRows: 0
}
```

之前的代码错误地将其包装为：

```javascript
{
  rows: [],
  rowCount: 0,
  fields: []
}
```

这导致无法获取 `insertId` 和 `affectedRows` 等重要信息。

## 问题原因

在 [`database.service.ts`](../src/modules/database/database.service.ts) 的 `executeMySQLQuery` 方法中，所有查询结果都被统一包装成 `{ rows, rowCount, fields }` 格式：

```typescript
// 旧代码
const [rows, fields] = await this.mysqlPool.query(sql, params);

return {
  rows: Array.isArray(rows) ? rows : [],
  rowCount: Array.isArray(rows) ? rows.length : 0,
  fields: fields || [],
};
```

但 MySQL 的 `query` 方法对于不同的 SQL 操作返回不同类型的结果：

1. **SELECT 查询** - 返回数组 `[rows, fields]`
2. **INSERT/UPDATE/DELETE** - 返回 `[ResultSetHeader, fields]`

## 修复方案

### 修改 `executeMySQLQuery` 方法

添加类型判断，根据结果类型返回不同的格式：

```typescript
/**
 * 执行MySQL查询
 */
private async executeMySQLQuery(sql: string, params: any[]): Promise<any> {
  this.logger.debug(`执行MySQL查询: ${sql}, 参数: ${JSON.stringify(params)}`);

  if (!this.mysqlPool) {
    throw new Error('MySQL连接池未初始化');
  }

  try {
    const [result, fields] = await this.mysqlPool.query(sql, params);
    
    console.log('sql = ', sql);
    console.log('params = ', params);
    console.log('result = ', result);
    
    // 判断结果类型：ResultSetHeader（INSERT/UPDATE/DELETE）还是查询结果（SELECT）
    // ResultSetHeader 对象有 affectedRows、insertId 等属性
    const isResultSetHeader = result && typeof result === 'object' && 
                           'affectedRows' in result && 
                           'insertId' in result;
    
    if (isResultSetHeader) {
      // INSERT/UPDATE/DELETE 操作，返回 ResultSetHeader 对象
      return result;
    } else {
      // SELECT 查询，返回数组格式
      return {
        rows: Array.isArray(result) ? result : [],
        rowCount: Array.isArray(result) ? result.length : 0,
        fields: fields || [],
      };
    }
  } catch (error) {
    this.logger.error(`MySQL查询执行失败: ${error.message}`, error.stack);
    throw error;
  }
}
```

## MySQL 查询结果类型

### 1. SELECT 查询

返回格式：`[rows, fields]`

```javascript
[
  [
    { id: 1, name: '张三', age: 25 },
    { id: 2, name: '李四', age: 26 }
  ],
  [
    { catalog: 'def', schema: 'test', table: 'user', ... },
    { catalog: 'def', schema: 'test', table: 'user', ... }
  ]
]
```

包装后：

```javascript
{
  rows: [
    { id: 1, name: '张三', age: 25 },
    { id: 2, name: '李四', age: 26 }
  ],
  rowCount: 2,
  fields: [...]
}
```

### 2. INSERT 查询

返回格式：`[ResultSetHeader, fields]`

```javascript
[
  ResultSetHeader {
    fieldCount: 0,
    affectedRows: 1,
    insertId: 20,
    info: '',
    serverStatus: 2,
    warningStatus: 0,
    changedRows: 0
  },
  undefined
]
```

修复后直接返回 `ResultSetHeader` 对象。

### 3. UPDATE 查询

返回格式：`[ResultSetHeader, fields]`

```javascript
[
  ResultSetHeader {
    fieldCount: 0,
    affectedRows: 1,
    insertId: 0,
    info: 'Rows matched: 1  Changed: 1  Warnings: 0',
    serverStatus: 2,
    warningStatus: 0,
    changedRows: 1
  },
  undefined
]
```

修复后直接返回 `ResultSetHeader` 对象。

### 4. DELETE 查询

返回格式：`[ResultSetHeader, fields]`

```javascript
[
  ResultSetHeader {
    fieldCount: 0,
    affectedRows: 1,
    insertId: 0,
    info: '',
    serverStatus: 2,
    warningStatus: 0,
    changedRows: 0
  },
  undefined
]
```

修复后直接返回 `ResultSetHeader` 对象。

## ResultSetHeader 对象属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `fieldCount` | number | 结果集中的字段数 |
| `affectedRows` | number | 受影响的行数 |
| `insertId` | number | 插入的 ID（仅 INSERT 操作） |
| `info` | string | 额外信息 |
| `serverStatus` | number | 服务器状态 |
| `warningStatus` | number | 警告状态 |
| `changedRows` | number | 实际更改的行数 |

## 使用示例

### INSERT 操作

```typescript
const result = await this.databaseService.query(
  'INSERT INTO user (name, age) VALUES (?, ?)',
  ['张三', 25]
);

// result 是 ResultSetHeader 对象
console.log(result.insertId);      // 20 - 插入的 ID
console.log(result.affectedRows);  // 1 - 影响的行数
```

### UPDATE 操作

```typescript
const result = await this.databaseService.query(
  'UPDATE user SET age = ? WHERE id = ?',
  [26, 20]
);

// result 是 ResultSetHeader 对象
console.log(result.affectedRows);  // 1 - 影响的行数
console.log(result.changedRows);   // 1 - 实际更改的行数
```

### DELETE 操作

```typescript
const result = await this.databaseService.query(
  'DELETE FROM user WHERE id = ?',
  [20]
);

// result 是 ResultSetHeader 对象
console.log(result.affectedRows);  // 1 - 删除的行数
```

### SELECT 操作

```typescript
const result = await this.databaseService.query(
  'SELECT * FROM user WHERE id = ?',
  [20]
);

// result 是 { rows, rowCount, fields } 对象
console.log(result.rows);      // [{ id: 20, name: '张三', age: 25 }]
console.log(result.rowCount);  // 1
```

## 提取方法

### extractInsertId

```typescript
private extractInsertId(result: any): number {
  if (result && result.insertId !== undefined) {
    return result.insertId;
  }

  if (result && result.rows && result.rows[0] && result.rows[0].insertId !== undefined) {
    return result.rows[0].insertId;
  }

  return 0;
}
```

### extractAffectedRows

```typescript
private extractAffectedRows(result: any): number {
  if (result && result.affectedRows !== undefined) {
    return result.affectedRows;
  }

  if (result && result.rowCount !== undefined) {
    return result.rowCount;
  }

  return 0;
}
```

## 修复后的效果

### INSERT 操作

```bash
curl -X 'POST' \
  'http://localhost:3900/api/apijson/post' \
  -H 'Content-Type: application/json' \
  -d '{
  "user": {
    "name": "张三",
    "age": 25
  }
}'
```

**日志输出**：
```
sql =  INSERT INTO `user` (`name`, `age`) VALUES (?, ?)
params =  ['张三', 25]
result =  ResultSetHeader {
  fieldCount: 0,
  affectedRows: 1,
  insertId: 20,
  info: '',
  serverStatus: 2,
  warningStatus: 0,
  changedRows: 0
}
insertId =  20
```

**返回结果**：
```json
{
  "status": "success",
  "code": 200,
  "message": "请求成功",
  "data": {
    "user": [
      {
        "id": 20,
        "name": "张三",
        "age": 25,
        "created_at": "2026-01-02T02:30:00.000Z",
        "updated_at": "2026-01-02T02:30:00.000Z"
      }
    ]
  }
}
```

## 相关文件

- [`src/modules/database/database.service.ts`](../src/modules/database/database.service.ts) - 数据库服务
- [`src/modules/executor/mysql-executor.service.ts`](../src/modules/executor/mysql-executor.service.ts) - MySQL 执行器服务

## 注意事项

1. **类型判断** - 使用 `affectedRows in result` 和 `insertId in result` 来判断是否为 `ResultSetHeader`
2. **向后兼容** - SELECT 查询仍然返回 `{ rows, rowCount, fields }` 格式
3. **错误处理** - 如果查询失败，错误会被正确抛出
4. **调试日志** - 保留了 console.log 用于调试
