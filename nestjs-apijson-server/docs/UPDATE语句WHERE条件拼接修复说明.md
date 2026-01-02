# UPDATE 语句 WHERE 条件拼接修复说明

## 问题描述

执行 UPDATE 操作时，SQL 语句的 WHERE 条件中包含了所有字段（包括要更新的字段），导致语法错误。

### 错误示例

**请求**：
```bash
curl -X 'POST' \
  'http://localhost:3900/api/apijson/put' \
  -H 'Content-Type: application/json' \
  -d '{
  "user": {
    "id": 16,
    "name": "李旭",
    "age": 26
  }
}'
```

**错误响应**：
```json
{
  "status": "error",
  "code": 500,
  "message": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '`id` = 16 AND `name` = '李旭' AND `age` = 26' at line 1",
  "errors": [
    "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '`id` = 16 AND `name` = '李旭' AND `age` = 26' at line 1"
  ]
}
```

**日志输出**：
```
[DatabaseService] 执行SQL语句: UPDATE `user` SET `name` = ?, `age` = ?WHERE `id` = ? AND `name` = ? AND `age` = ?, 参数: ["李旭",26,16,"李旭",26]
```

### 错误的 SQL

```sql
UPDATE `user` SET `name` = ?, `age` = ?WHERE `id` = ? AND `name` = ? AND `age` = ?
```

### 正确的 SQL

```sql
UPDATE `user` SET `name` = ?, `age` = ?WHERE `id` = ?
```

## 问题原因

在 [`core-parser.service.ts`](../src/modules/parser/core-parser.service.ts) 的 `parseWhere` 方法中，所有字段都被添加到 `where` 对象中：

```typescript
// 旧代码
private parseWhere(tableData: any): { where: any; references: { [key: string]: string } } {
  const where: any = {};
  const references: { [key: string]: string } = {};
  
  for (const [key, value] of Object.entries(tableData)) {
    // 跳过指令和特殊字段
    if (this.isDirectiveKey(key) || this.isSpecialField(key)) {
      continue;
    }
    
    // 所有字段都被添加到 where 对象中
    where[key] = value;
  }
  
  return { where, references };
}
```

对于 UPDATE 请求：
```json
{
  "user": {
    "id": 16,
    "name": "李旭",
    "age": 26
  }
}
```

解析后：
```typescript
{
  where: {
    id: 16,
    name: "李旭",
    age: 26
  }
}
```

然后在 [`mysql-builder.service.ts`](../src/modules/builder/mysql-builder.service.ts) 中，`buildUpdateQuery` 方法使用这个 `where` 对象构建 WHERE 子句：

```typescript
// 旧代码
private buildUpdateQuery(tableName: string, tableQuery: TableQuery): { sql: string; params: any[] } {
  const params: any[] = [];
  
  // 提取要更新的数据
  const data = this.extractUpdateData(tableQuery.data);
  
  // 构建 SET 子句
  const setClause = Object.keys(data)
    .filter(col => !col.startsWith('@') && col !== 'id')
    .map(col => {
      params.push(data[col]);
      return `\`${col}\` = ?`;
    })
    .join(', ');
  
  // 构建 WHERE 子句（传递 references 参数）
  const whereResult = this.buildWhereClause(tableQuery.where, tableQuery.references);
  const whereClause = whereResult.where;
  params.push(...whereResult.params);
  
  const sql = `UPDATE \`${tableName}\` SET ${setClause}${whereClause}`;
  return { sql, params };
}
```

这导致 `name` 和 `age` 也被添加到 WHERE 条件中。

## 修复方案

### 修改 `parseTableQuery` 方法

在 [`core-parser.service.ts`](../src/modules/parser/core-parser.service.ts) 中，对于 UPDATE 操作，需要区分 WHERE 条件和要更新的数据：

```typescript
// 如果是对象，处理对象查询
if (typeof tableData === 'object' && tableData !== null) {
  // 对于 UPDATE 操作，需要区分 WHERE 条件和要更新的数据
  if (operation === TableOperation.UPDATE) {
    // UPDATE 操作：id 在 WHERE 条件中，其他字段在 SET 子句中
    const updateData: any = {};
    const whereConditions: any = {};
    const references: { [key: string]: string } = {};
      
    for (const [key, value] of Object.entries(tableData)) {
      // 跳过指令和特殊字段
      if (this.isDirectiveKey(key) || this.isSpecialField(key)) {
        continue;
      }
        
      // id 字段作为 WHERE 条件
      if (key === 'id') {
        whereConditions[key] = value;
      } else if (key.endsWith('@')) {
        // 引用赋值，如 order_id@: "/receive/id"
        const fieldName = key.slice(0, -1);
        whereConditions[fieldName] = value; // 临时保存引用路径
        references[fieldName] = String(value); // 记录引用映射，确保类型为 string
      } else {
        // 其他字段作为要更新的数据
        updateData[key] = value;
      }
    }
    
    return {
      name: tableName,
      operation,
      columns: this.parseColumns(tableData['@column'] || tableData['columns']),
      where: whereConditions,
      joins: this.parseJoins(tableData['@join'] || tableData['joins']),
      group: this.parseGroup(tableData['@group'] || tableData['group']),
      having: this.parseHaving(tableData['@having'] || tableData['having']),
      order: this.parseOrder(tableData['@order'] || tableData['order']),
      limit: this.parseLimit(tableData['@count'] || tableData['count'] || tableData['limit']),
      offset: this.parseOffset(tableData['@page'] || tableData['page']),
      isArray,
      query: this.parseQueryType(tableData['@query'] || tableData['query']),
      cache: this.parseCache(tableData['@cache'] || tableData['cache']),
      role: tableData['@role'] || tableData['role'],
      database: tableData['@database'] || tableData['database'],
      schema: tableData['@schema'] || tableData['schema'],
      explain: tableData['@explain'] || tableData['explain'],
      data: updateData, // 用于 UPDATE 操作（不包含 id）
      references: references, // 添加引用字段映射
    };
  } else {
    // 其他操作：正常解析 WHERE 条件和引用字段
    const whereResult = this.parseWhere(tableData);
    
    return {
      name: tableName,
      operation,
      columns: this.parseColumns(tableData['@column'] || tableData['columns']),
      where: whereResult.where,
      joins: this.parseJoins(tableData['@join'] || tableData['joins']),
      group: this.parseGroup(tableData['@group'] || tableData['group']),
      having: this.parseHaving(tableData['@having'] || tableData['having']),
      order: this.parseOrder(tableData['@order'] || tableData['order']),
      limit: this.parseLimit(tableData['@count'] || tableData['count'] || tableData['limit']),
      offset: this.parseOffset(tableData['@page'] || tableData['page']),
      isArray,
      query: this.parseQueryType(tableData['@query'] || tableData['query']),
      cache: this.parseCache(tableData['@cache'] || tableData['cache']),
      role: tableData['@role'] || tableData['role'],
      database: tableData['@database'] || tableData['database'],
      schema: tableData['@schema'] || tableData['schema'],
      explain: tableData['@explain'] || tableData['explain'],
      data: tableData, // 用于 INSERT/UPDATE 操作
      references: whereResult.references, // 添加引用字段映射
    };
  }
}
```

## 修复后的效果

### UPDATE 请求

```bash
curl -X 'POST' \
  'http://localhost:3900/api/apijson/put' \
  -H 'Content-Type: application/json' \
  -d '{
  "user": {
    "id": 16,
    "name": "李旭",
    "age": 26
  }
}'
```

### 正确的 SQL

```sql
UPDATE `user` SET `name` = ?, `age` = ?WHERE `id` = ?
```

### 参数

```javascript
["李旭", 26, 16]
```

### 成功响应

```json
{
  "status": "success",
  "code": 200,
  "message": "请求成功",
  "data": {
    "user": [
      {
        "id": 16,
        "name": "李旭",
        "age": 26
      }
    ]
  },
  "processingTime": 10,
  "timestamp": "2026-01-02T03:18:17.385Z",
  "path": "/apijson/put",
  "cached": false
}
```

## UPDATE 操作的字段分类

### WHERE 条件字段

- `id` - 主键，用于定位要更新的记录

### SET 子句字段

- 所有其他字段（不包括 id）
- 例如：`name`、`age`、`email` 等

### 特殊字段

- 指令字段（以 `@` 开头）
- 引用字段（以 `@` 结尾）

## 相关文件

- [`src/modules/parser/core-parser.service.ts`](../src/modules/parser/core-parser.service.ts) - 核心解析器服务
- [`src/modules/builder/mysql-builder.service.ts`](../src/modules/builder/mysql-builder.service.ts) - MySQL 构建器服务

## 注意事项

1. **id 字段** - 对于 UPDATE 操作，`id` 字段必须作为 WHERE 条件
2. **其他字段** - 其他字段应该作为要更新的数据，不添加到 WHERE 条件
3. **引用字段** - 引用字段应该保持在 WHERE 条件中
4. **向后兼容** - 其他操作（SELECT、INSERT、DELETE）不受影响

## 测试建议

建议测试以下场景：

1. 单字段更新 - 只更新 `name`
2. 多字段更新 - 更新 `name` 和 `age`
3. 条件更新 - 使用条件更新多条记录
4. 引用更新 - 使用引用字段更新
5. 批量更新 - 更新多条记录
