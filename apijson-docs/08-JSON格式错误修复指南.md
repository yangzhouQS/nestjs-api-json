# APIJSON JSON 格式错误修复指南

## 常见错误：对象末尾多余逗号

### 错误示例

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date,supplier_name,status,created_at",  // ❌ 这里有多余的逗号
  },
  "receive_item": {
    "order_id@": "/receive/id",
    "@column": "id,content"
  }
}
```

**错误信息：**
```
BadRequestException: Expected double-quoted property name in JSON at position 111 (line 5 column 3)
```

### 问题分析

在 JSON 格式中，**对象的最后一个属性后面不能有逗号**。这是 JSON 与 JavaScript 对象字面量的一个重要区别。

### 正确示例

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date,supplier_name,status,created_at"  // ✅ 移除了逗号
  },
  "receive_item": {
    "order_id@": "/receive/id",
    "@column": "id,content"
  }
}
```

## 多表关联查询的正确格式

### 基本语法

```json
{
  "主表": {
    "查询条件": "值",
    "@column": "字段1,字段2,字段3"
  },
  "关联表": {
    "关联字段@": "/主表/关联字段",
    "@column": "字段1,字段2"
  }
}
```

### 实际示例：订单与订单明细关联

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date,supplier_name,status,created_at"
  },
  "receive_item": {
    "order_id@": "/receive/id",
    "@column": "id,content"
  }
}
```

**说明：**
- `receive`：主表（订单表）
- `receive_item`：关联表（订单明细表）
- `"order_id@": "/receive/id"`：引用赋值，表示 `receive_item.order_id` 等于 `receive.id`
- `@column`：指定返回的字段列表

## 其他常见 JSON 格式错误

### 1. 字符串必须使用双引号

❌ **错误：**
```json
{
  'name': '张三'  // ❌ 使用了单引号
}
```

✅ **正确：**
```json
{
  "name": "张三"  // ✅ 使用双引号
}
```

### 2. 键名必须使用双引号

❌ **错误：**
```json
{
  name: "张三"  // ❌ 键名没有引号
}
```

✅ **正确：**
```json
{
  "name": "张三"  // ✅ 键名有双引号
}
```

### 3. 数组末尾不能有逗号

❌ **错误：**
```json
{
  "ids": [1, 2, 3,]  // ❌ 数组末尾有逗号
}
```

✅ **正确：**
```json
{
  "ids": [1, 2, 3]  // ✅ 数组末尾没有逗号
}
```

### 4. 不能有注释

❌ **错误：**
```json
{
  "name": "张三",  // ❌ JSON 不支持注释
  "age": 25
}
```

✅ **正确：**
```json
{
  "name": "张三",
  "age": 25
}
```

### 5. 字符串中的特殊字符需要转义

❌ **错误：**
```json
{
  "content": "这是一个"测试"字符串"  // ❌ 双引号未转义
}
```

✅ **正确：**
```json
{
  "content": "这是一个\"测试\"字符串"  // ✅ 双引号已转义
}
```

## JSON 验证工具

### 在线验证工具

1. **JSONLint**: https://jsonlint.com/
2. **JSON Formatter**: https://jsonformatter.curiousconcept.com/
3. **JSON Editor Online**: https://jsoneditoronline.org/

### 浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 使用 `JSON.parse()` 验证：

```javascript
// 在浏览器控制台中执行
try {
  const json = {
    "receive": {
      "id": 1,
      "@column": "id,order_code,order_date,supplier_name,status,created_at"
    },
    "receive_item": {
      "order_id@": "/receive/id",
      "@column": "id,content"
    }
  };
  console.log("JSON 格式正确");
} catch (error) {
  console.error("JSON 格式错误:", error);
}
```

### VS Code 扩展

1. **JSON Tools**: 提供 JSON 格式化和验证功能
2. **Prettier**: 自动格式化 JSON 文件

## 多表关联查询完整示例

### 示例 1：一对多关联

查询订单及其所有明细：

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date,supplier_name"
  },
  "receive_item[]": {
    "count": 0,
    "receive_item": {
      "order_id@": "/receive/id",
      "@column": "id,content,quantity"
    }
  }
}
```

### 示例 2：多对一关联

查询多个订单明细及其对应的订单：

```json
{
  "receive_item[]": {
    "count": 10,
    "receive_item": {
      "@order": "id-"
    }
  },
  "receive": {
    "id@": "[]/receive_item/order_id",
    "@column": "id,order_code,supplier_name"
  }
}
```

### 示例 3：三层关联

查询订单、订单明细和商品信息：

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date"
  },
  "receive_item[]": {
    "count": 0,
    "receive_item": {
      "order_id@": "/receive/id",
      "@column": "id,product_id,quantity"
    }
  },
  "product": {
    "id@": "[]/receive_item/product_id",
    "@column": "id,name,price"
  }
}
```

## 调试技巧

### 1. 逐步验证

先验证主表查询是否正常：

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date"
  }
}
```

### 2. 添加关联表

主表正常后，再添加关联表：

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date"
  },
  "receive_item": {
    "order_id@": "/receive/id",
    "@column": "id,content"
  }
}
```

### 3. 检查引用路径

确保引用路径正确：
- `/receive/id`：从根节点开始的完整路径
- `[]/receive_item/order_id`：引用数组中的字段

### 4. 使用日志

在开发环境中启用日志，查看生成的 SQL：

```json
{
  "receive": {
    "id": 1,
    "@column": "id,order_code,order_date",
    "@debug": true
  },
  "receive_item": {
    "order_id@": "/receive/id",
    "@column": "id,content",
    "@debug": true
  }
}
```

## 常见错误代码

| 错误代码 | 错误信息 | 原因 | 解决方案 |
|---------|---------|------|---------|
| 400 | JSON 解析错误 | JSON 格式不正确 | 检查 JSON 语法，移除多余逗号 |
| 404 | 引用路径不存在 | 引用的表或字段不存在 | 检查引用路径是否正确 |
| 500 | 数据库错误 | SQL 执行失败 | 检查数据库连接和表结构 |

## 最佳实践

### 1. 使用 JSON 格式化工具

在发送请求前，使用工具格式化和验证 JSON：

```bash
# 使用 jq 格式化 JSON
echo '{"receive":{"id":1}}' | jq .
```

### 2. 编写测试用例

为每个关联查询编写测试用例：

```javascript
describe('多表关联查询', () => {
  it('应该正确查询订单及其明细', async () => {
    const request = {
      receive: {
        id: 1,
        "@column": "id,order_code"
      },
      receive_item: {
        "order_id@": "/receive/id",
        "@column": "id,content"
      }
    };
    const response = await apijsonRequest(request);
    expect(response.code).toBe(200);
  });
});
```

### 3. 使用 TypeScript 类型定义

使用 TypeScript 定义请求类型：

```typescript
interface ReceiveItemRequest {
  receive: {
    id?: number;
    "@column"?: string;
  };
  receive_item: {
    "order_id@"?: string;
    "@column"?: string;
  };
}
```

### 4. 添加请求验证

在发送请求前验证 JSON 格式：

```typescript
function validateJSON(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    console.error('JSON 格式错误:', error);
    return false;
  }
}
```

## 总结

1. **JSON 格式严格**：必须符合 JSON 规范，不能有末尾逗号
2. **使用验证工具**：在发送请求前验证 JSON 格式
3. **逐步调试**：从简单查询开始，逐步添加关联
4. **检查引用路径**：确保引用路径正确且存在
5. **编写测试**：为每个查询编写测试用例

通过遵循这些指南，可以避免大多数 JSON 格式错误，确保多表关联查询正常工作。
