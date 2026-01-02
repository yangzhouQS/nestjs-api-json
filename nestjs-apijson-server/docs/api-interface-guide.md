# APIJSON 接口使用示例文档

## 目录
1. [接口概述](#1-接口概述)
2. [认证说明](#2-认证说明)
3. [接口详情](#3-接口详情)
4. [请求示例](#4-请求示例)
5. [数据操作示例](#5-数据操作示例)
6. [响应格式](#6-响应格式)
7. [错误码说明](#7-错误码说明)
8. [最佳实践](#8-最佳实践)

---

## 1. 接口概述

### 1.1 基础URL
```
基础URL: http://localhost:3000/apijson
```

### 1.2 支持的HTTP方法
| 方法 | 说明 |
|--------|------|
| POST | 执行APIJSON查询、清空缓存 |
| GET | 获取API信息、统计信息 |

### 1.3 认证方式
| 方式 | 说明 |
|--------|------|
| Bearer Token | 在请求头中携带 `Authorization: Bearer {token}` |
| 无认证 | 某些接口（如info）不需要认证 |

---

## 2. 认证说明

### 2.1 获取Token
```http
POST /apijson/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "username": "admin",
      "roles": ["admin"]
    },
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.2 刷新Token
```http
POST /apijson/auth/refresh
Authorization: Bearer {refreshToken}

响应示例：
{
  "status": "success",
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.3 登出
```http
POST /apijson/auth/logout
Authorization: Bearer {token}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "登出成功"
}
```

---

## 3. 接口详情

### 3.1 POST /apijson - 执行APIJSON查询

#### 3.1.1 接口说明
执行APIJSON格式的数据查询请求，支持完整的APIJSON语法。

#### 3.1.2 请求参数
| 参数 | 类型 | 必填 | 说明 |
|--------|------|--------|------|
| request | Object | 是 | APIJSON格式的请求对象 |
| headers | Object | 否 | 自定义请求头 |

#### 3.1.3 请求示例

**示例1：简单查询**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "columns": ["id", "username", "email"],
    "where": {
      "status": "active",
      "createdAt": { "$gte": "2024-01-01" }
    },
    "limit": 20,
    "offset": 0
  }
}
```

**示例2：多表关联查询**
```json
POST /apijson
Content-Type: application/json

{
  "User": {
    "columns": ["u.id", "u.username", "p.bio"],
    "joins": [
      {
        "type": "LEFT",
        "table": "Profile",
        "alias": "p",
        "on": "u.id = p.userId"
      }
    ],
    "limit": 10
  },
  "Profile": {
    "columns": ["p.userId", "p.avatar"],
    "where": {
      "status": "active"
    }
  }
}
```

**示例3：使用全局指令**
```json
POST /apijson
Content-Type: application/json

{
  "User": {
    "columns": ["id", "username"],
    "limit": 10
  },
  "@method": "GET",
  "@page": 1,
  "@cache": 60000,
  "@total": true
}
```

**示例4：复杂条件查询**
```json
POST /apijson
Content-Type: application/json

{
  "User": {
    "where": {
      "$or": [
        { "status": "active", "age": { "$gt": 18 } },
        { "status": "pending", "age": { "$gte": 18, "$lt": 30 } }
      ]
    },
    "orderBy": ["createdAt-"],
    "limit": 50
  }
}
```

**示例5：分组和聚合**
```json
POST /apijson
Content-Type: application/json

{
  "User": {
    "columns": ["department", "COUNT(*) as userCount"],
    "groupBy": ["department"],
    "having": {
      "userCount": { "$gt": 10 }
    },
    "limit": 100
  }
}
```

**示例6：数据新增（INSERT）**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "username": "newuser",
    "email": "newuser@example.com",
    "status": "active",
    "age": 25
  },
  "@method": "POST"
}
```

**示例7：数据修改（UPDATE）**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 1,
    "email": "updated@example.com",
    "status": "active"
  },
  "@method": "PUT"
}
```

**示例8：部分数据修改（PATCH）**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 1,
    "status": "inactive"
  },
  "@method": "PATCH"
}
```

**示例9：数据删除（DELETE）**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 1
  },
  "@method": "DELETE"
}
```

**示例10：批量新增**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User[]": [
    {
      "username": "user1",
      "email": "user1@example.com",
      "status": "active"
    },
    {
      "username": "user2",
      "email": "user2@example.com",
      "status": "active"
    }
  ],
  "@method": "POST"
}
```

**示例11：批量修改**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "status": "pending"
    },
    "status": "active"
  },
  "@method": "PUT"
}
```

**示例12：批量删除**
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "status": "deleted"
    }
  },
  "@method": "DELETE"
}
```

#### 3.1.4 响应示例

**成功响应：**
```json
{
  "status": "success",
  "code": 200,
  "message": "请求成功",
  "data": {
    "User": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
      },
      {
        "id": 2,
        "username": "user1",
        "email": "user1@example.com"
      }
    ],
    "Profile": [
      {
        "userId": 1,
        "bio": "管理员简介"
      }
    ]
  },
  "warnings": [
    "建议在createdAt字段上添加索引以提高查询性能"
  ],
  "processingTime": 125,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

**失败响应（验证失败）：**
```json
{
  "status": "error",
  "code": 400,
  "message": "请求验证失败",
  "errors": [
    "表名 \"InvalidTable\" 不符合规范",
    "表 \"User\" 的列配置不正确"
  ],
  "warnings": [],
  "processingTime": 5,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

### 3.2 POST /apijson/cache/clear - 清空缓存

#### 3.2.1 接口说明
清空所有APIJSON查询缓存。

#### 3.2.2 请求参数
无

#### 3.2.3 请求示例
```http
POST /apijson/cache/clear
Authorization: Bearer {token}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "缓存已清空",
  "data": {
    "clearedCount": 150
  },
  "processingTime": 50,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson/cache/clear",
  "cached": false
}
```

### 3.3 GET /apijson/info - 获取API信息

#### 3.3.1 接口说明
获取APIJSON服务的基本信息和功能列表。

#### 3.3.2 请求参数
无

#### 3.3.3 响应示例
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "name": "APIJSON Server",
    "version": "1.0.0",
    "description": "基于 NestJS 的 APIJSON 服务器实现",
    "features": [
      "完整的 APIJSON 语法支持",
      "强大的查询解析和验证",
      "内置认证和授权",
      "详细的日志和性能监控",
      "灵活的缓存策略",
      "完整的 API 文档"
    ],
    "supportedDirectives": [
      "@method",
      "@page",
      "@limit",
      "@offset",
      "@order",
      "@search",
      "@group",
      "@cache",
      "@total",
      "@count"
    ],
    "supportedDatabases": [
      "MySQL",
      "PostgreSQL",
      "SQLite",
      "SQL Server",
      "Oracle"
    ]
  }
}
```

### 3.4 GET /apijson/stats - 获取统计信息

#### 3.4.1 接口说明
获取APIJSON服务的统计信息，包括请求量、响应时间、缓存命中率等。

#### 3.4.2 响应示例
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "totalRequests": 123456,
    "successfulRequests": 122000,
    "failedRequests": 1456,
    "averageProcessingTime": 125,
    "cacheHitRate": 85.5,
    "lastRequestTime": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## 5. 数据操作示例

### 5.1 数据新增（INSERT）

#### 5.1.1 基础新增
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "username": "john_doe",
    "email": "john.doe@example.com",
    "password": "hashed_password",
    "status": "active",
    "age": 28,
    "department": "技术部"
  },
  "@method": "POST"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "数据新增成功",
  "data": {
    "User": {
      "id": 123,
      "username": "john_doe",
      "email": "john.doe@example.com",
      "status": "active",
      "age": 28,
      "department": "技术部",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  },
  "processingTime": 45,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.1.2 批量新增
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User[]": [
    {
      "username": "alice",
      "email": "alice@example.com",
      "status": "active"
    },
    {
      "username": "bob",
      "email": "bob@example.com",
      "status": "active"
    },
    {
      "username": "charlie",
      "email": "charlie@example.com",
      "status": "active"
    }
  ],
  "@method": "POST"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量新增成功",
  "data": {
    "User": [
      {
        "id": 124,
        "username": "alice",
        "email": "alice@example.com",
        "status": "active"
      },
      {
        "id": 125,
        "username": "bob",
        "email": "bob@example.com",
        "status": "active"
      },
      {
        "id": 126,
        "username": "charlie",
        "email": "charlie@example.com",
        "status": "active"
      }
    ]
  },
  "processingTime": 120,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.1.3 新增关联数据
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "username": "david",
    "email": "david@example.com",
    "status": "active"
  },
  "Profile": {
    "userId": "@User.id",
    "bio": "全栈开发工程师",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "13800138000"
  },
  "@method": "POST"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "数据新增成功",
  "data": {
    "User": {
      "id": 127,
      "username": "david",
      "email": "david@example.com",
      "status": "active"
    },
    "Profile": {
      "id": 45,
      "userId": 127,
      "bio": "全栈开发工程师",
      "avatar": "https://example.com/avatar.jpg",
      "phone": "13800138000"
    }
  },
  "processingTime": 85,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.1.4 使用curl新增数据
```bash
# 新增单条数据
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "username": "newuser",
      "email": "newuser@example.com",
      "status": "active"
    },
    "@method": "POST"
  }'

# 批量新增
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User[]": [
      {"username": "user1", "email": "user1@example.com"},
      {"username": "user2", "email": "user2@example.com"}
    ],
    "@method": "POST"
  }'
```

### 5.2 数据修改（UPDATE）

#### 5.2.1 基础修改（PUT）
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 123,
    "email": "newemail@example.com",
    "status": "active",
    "age": 29
  },
  "@method": "PUT"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "数据修改成功",
  "data": {
    "User": {
      "id": 123,
      "username": "john_doe",
      "email": "newemail@example.com",
      "status": "active",
      "age": 29,
      "updatedAt": "2024-01-01T12:05:00.000Z"
    }
  },
  "processingTime": 50,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.2.2 部分修改（PATCH）
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 123,
    "status": "inactive"
  },
  "@method": "PATCH"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "数据修改成功",
  "data": {
    "User": {
      "id": 123,
      "status": "inactive",
      "updatedAt": "2024-01-01T12:05:00.000Z"
    }
  },
  "processingTime": 35,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.2.3 条件批量修改
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "status": "pending",
      "createdAt": { "$lt": "2024-01-01" }
    },
    "status": "rejected"
  },
  "@method": "PUT"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量修改成功",
  "data": {
    "User": {
      "affectedRows": 15
    }
  },
  "processingTime": 150,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.2.4 使用IN条件批量修改
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "id": { "$in": [123, 124, 125] }
    },
    "status": "verified"
  },
  "@method": "PUT"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量修改成功",
  "data": {
    "User": {
      "affectedRows": 3
    }
  },
  "processingTime": 80,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.2.5 复杂条件修改
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "$or": [
        { "status": "pending", "age": { "$gt": 18 } },
        { "status": "inactive", "lastLoginAt": { "$lt": "2023-12-01" } }
      ]
    },
    "status": "archived",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "@method": "PUT"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量修改成功",
  "data": {
    "User": {
      "affectedRows": 42
    }
  },
  "processingTime": 200,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.2.6 使用curl修改数据
```bash
# 完整修改（PUT）
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "id": 123,
      "email": "updated@example.com",
      "status": "active"
    },
    "@method": "PUT"
  }'

# 部分修改（PATCH）
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "id": 123,
      "status": "inactive"
    },
    "@method": "PATCH"
  }'

# 批量修改
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "where": {
        "status": "pending"
      },
      "status": "active"
    },
    "@method": "PUT"
  }'
```

### 5.3 数据删除（DELETE）

#### 5.3.1 基础删除（按ID）
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "id": 123
  },
  "@method": "DELETE"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "数据删除成功",
  "data": {
    "User": {
      "affectedRows": 1
    }
  },
  "processingTime": 40,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.3.2 条件批量删除
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "status": "deleted",
      "createdAt": { "$lt": "2023-01-01" }
    }
  },
  "@method": "DELETE"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量删除成功",
  "data": {
    "User": {
      "affectedRows": 25
    }
  },
  "processingTime": 180,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.3.3 使用IN条件批量删除
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "id": { "$in": [100, 101, 102, 103] }
    }
  },
  "@method": "DELETE"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量删除成功",
  "data": {
    "User": {
      "affectedRows": 4
    }
  },
  "processingTime": 95,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.3.4 软删除（推荐）
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "id": 123
    },
    "status": "deleted",
    "deletedAt": "2024-01-01T12:05:00.000Z"
  },
  "@method": "PUT"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "软删除成功",
  "data": {
    "User": {
      "affectedRows": 1
    }
  },
  "processingTime": 45,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.3.5 复杂条件删除
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer {token}

{
  "User": {
    "where": {
      "$and": [
        { "status": "inactive" },
        { "lastLoginAt": { "$lt": "2023-06-01" } },
        { "createdAt": { "$lt": "2023-01-01" } }
      ]
    }
  },
  "@method": "DELETE"
}

响应示例：
{
  "status": "success",
  "code": 200,
  "message": "批量删除成功",
  "data": {
    "User": {
      "affectedRows": 8
    }
  },
  "processingTime": 150,
  "timestamp": "2024-01-01T12:05:00.000Z",
  "path": "/apijson",
  "cached": false
}
```

#### 5.3.6 使用curl删除数据
```bash
# 删除单条数据
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "id": 123
    },
    "@method": "DELETE"
  }'

# 批量删除
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "where": {
        "status": "deleted"
      }
    },
    "@method": "DELETE"
  }'

# 软删除
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "where": {
        "id": 123
      },
      "status": "deleted",
      "deletedAt": "2024-01-01T12:05:00.000Z"
    },
    "@method": "PUT"
  }'
```

### 5.4 JavaScript完整示例

#### 5.4.1 封装APIJSON客户端
```javascript
class APIJSONClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, data) {
    const response = await fetch(`${this.baseURL}/apijson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        ...data,
        '@method': method
      })
    });

    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    
    return result;
  }

  // 新增数据
  async insert(table, data) {
    return await this.request('POST', { [table]: data });
  }

  // 批量新增
  async batchInsert(table, dataArray) {
    return await this.request('POST', { [`${table}[]`]: dataArray });
  }

  // 修改数据
  async update(table, data) {
    return await this.request('PUT', { [table]: data });
  }

  // 部分修改
  async patch(table, data) {
    return await this.request('PATCH', { [table]: data });
  }

  // 删除数据
  async delete(table, condition) {
    return await this.request('DELETE', { [table]: condition });
  }

  // 查询数据
  async query(table, options = {}) {
    return await this.request('GET', { [table]: options });
  }
}

// 使用示例
const client = new APIJSONClient('http://localhost:3000', 'YOUR_TOKEN');

// 新增用户
await client.insert('User', {
  username: 'newuser',
  email: 'newuser@example.com',
  status: 'active'
});

// 批量新增
await client.batchInsert('User', [
  { username: 'user1', email: 'user1@example.com' },
  { username: 'user2', email: 'user2@example.com' }
]);

// 修改用户
await client.update('User', {
  id: 1,
  email: 'updated@example.com'
});

// 部分修改
await client.patch('User', {
  id: 1,
  status: 'inactive'
});

// 批量修改
await client.update('User', {
  where: { status: 'pending' },
  status: 'active'
});

// 删除用户
await client.delete('User', { id: 1 });

// 批量删除
await client.delete('User', {
  where: { status: 'deleted' }
});

// 查询用户
const result = await client.query('User', {
  columns: ['id', 'username', 'email'],
  where: { status: 'active' },
  limit: 10
});
```

#### 5.4.2 Axios完整示例
```javascript
import axios from 'axios';

class APIJSONClient {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(config => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response) {
          throw new Error(error.response.data.message || '请求失败');
        }
        throw error;
      }
    );
  }

  async request(method, data) {
    const response = await this.client.post('/apijson', {
      ...data,
      '@method': method
    });
    return response;
  }

  // CRUD操作方法
  async insert(table, data) {
    return await this.request('POST', { [table]: data });
  }

  async batchInsert(table, dataArray) {
    return await this.request('POST', { [`${table}[]`]: dataArray });
  }

  async update(table, data) {
    return await this.request('PUT', { [table]: data });
  }

  async patch(table, data) {
    return await this.request('PATCH', { [table]: data });
  }

  async delete(table, condition) {
    return await this.request('DELETE', { [table]: condition });
  }

  async query(table, options = {}) {
    return await this.request('GET', { [table]: options });
  }
}

// 使用示例
const client = new APIJSONClient('http://localhost:3000', 'YOUR_TOKEN');

// 异步操作示例
async function manageUsers() {
  try {
    // 新增用户
    const insertResult = await client.insert('User', {
      username: 'alice',
      email: 'alice@example.com',
      status: 'active'
    });
    console.log('新增成功:', insertResult);

    // 查询用户
    const users = await client.query('User', {
      columns: ['id', 'username', 'email'],
      where: { status: 'active' },
      limit: 10
    });
    console.log('用户列表:', users);

    // 修改用户
    const updateResult = await client.update('User', {
      id: users.data.User[0].id,
      email: 'newemail@example.com'
    });
    console.log('修改成功:', updateResult);

    // 删除用户
    const deleteResult = await client.delete('User', {
      id: users.data.User[0].id
    });
    console.log('删除成功:', deleteResult);

  } catch (error) {
    console.error('操作失败:', error.message);
  }
}

manageUsers();
```

### 5.5 数据操作最佳实践

#### 5.5.1 新增数据注意事项
1. **必填字段验证**：确保提供所有必填字段
2. **数据类型检查**：验证字段值的数据类型
3. **唯一性约束**：避免违反唯一性约束
4. **外键关联**：确保关联数据存在
5. **默认值**：合理使用数据库默认值

#### 5.5.2 修改数据注意事项
1. **乐观锁**：使用版本号避免并发冲突
2. **条件更新**：使用where条件精确匹配
3. **批量操作**：谨慎使用批量修改，先测试
4. **事务处理**：复杂操作使用事务保证一致性
5. **审计日志**：记录修改操作以便追溯

#### 5.5.3 删除数据注意事项
1. **软删除优先**：推荐使用软删除而非物理删除
2. **级联删除**：注意关联数据的处理
3. **备份重要数据**：删除前做好数据备份
4. **权限控制**：严格控制删除权限
5. **删除确认**：重要数据删除前进行二次确认

---

## 6. 请求示例

### 4.1 APIJSON语法速查

#### 4.1.1 基础查询
```json
// 查询所有用户
{ "User": {} }

// 查询指定字段
{ "User": { "columns": ["id", "username"] } }

// 查询前10条
{ "User": { "limit": 10 } }
```

#### 4.1.2 WHERE条件
```json
// 等于
{ "User": { "where": { "status": "active" } }

// 不等于
{ "User": { "where": { "status": { "$ne": "deleted" } } }

// 大于
{ "User": { "where": { "age": { "$gt": 18 } } }

// 小于
{ "User": { "where": { "age": { "$lt": 65 } } }

// 大于等于
{ "User": { "where": { "score": { "$gte": 60 } } }

// 小于等于
{ "User": { "where": { "score": { "$lte": 100 } } }

// 在列表中
{ "User": { "where": { "id": { "$in": [1, 2, 3] } } }

// 不在列表中
{ "User": { "where": { "id": { "$nin": [4, 5, 6] } } }

// 模糊匹配
{ "User": { "where": { "name": { "$like": "%张%" } } }

// 忽略大小写模糊匹配
{ "User": { "where": { "name": { "$ilike": "%zhang%" } } }
```

#### 4.1.3 逻辑操作符
```json
// AND条件（多个条件默认为AND）
{ "User": { "where": { "status": "active", "age": { "$gt": 18 } } }

// OR条件
{ "User": { "where": { "$or": [{ "status": "active" }, { "status": "pending" }] } }

// NOT条件
{ "User": { "where": { "$not": { "status": "deleted" } } }
```

#### 4.1.4 JOIN查询
```json
// INNER JOIN
{
  "User": {
    "joins": [
      {
        "type": "INNER",
        "table": "Profile",
        "alias": "p",
        "on": "User.id = p.userId"
      }
    ]
  }
}

// LEFT JOIN
{
  "User": {
    "joins": [
      {
        "type": "LEFT",
        "table": "Order",
        "alias": "o",
        "on": "User.id = o.userId"
      }
    ]
  }
}

// RIGHT JOIN
{
  "User": {
    "joins": [
      {
        "type": "RIGHT",
        "table": "Profile",
        "alias": "p",
        "on": "User.id = p.userId"
      }
    ]
  }
}
```

#### 4.1.5 分组与聚合
```json
// GROUP BY
{
  "User": {
    "groupBy": ["department"],
    "columns": ["department", "COUNT(*) as userCount"]
  }
}

// HAVING条件
{
  "User": {
    "groupBy": ["department"],
    "having": { "userCount": { "$gt": 10 } }
  }
}
```

#### 4.1.6 排序与分页
```json
// ORDER BY ASC（升序）
{
  "User": {
    "orderBy": ["username+", "createdAt+"]
  }
}

// ORDER BY DESC（降序）
{
  "User": {
    "orderBy": ["createdAt-", "updatedAt-"]
  }
}

// 分页
{
  "User": {
    "limit": 20,
    "offset": 0
  }
}

// 分页（使用page指令）
{
  "User": {
    "limit": 20,
    "@page": 1
  }
}
```

#### 4.1.7 全局指令
```json
// HTTP方法
{ "User": {}, "@method": "GET" }

// 分页
{ "User": {}, "@page": 1, "@limit": 20 }

// 排序
{ "User": {}, "@order": "createdAt-" }

// 缓存
{ "User": {}, "@cache": 300000 }

// 返回总数
{ "User": {}, "@total": true }

// 返回当前页数量
{ "User": {}, "@count": true }

// 搜索
{ "User": {}, "@search": "keyword" }

// 分组
{ "User": {}, "@group": "department" }
```

---

## 7. 响应格式

### 5.1 统一响应结构
```typescript
interface APIJSONResponse<T = any> {
  status: 'success' | 'error';  // 请求状态
  code: number;                          // 业务状态码
  message: string;                        // 提示信息
  data?: T;                             // 响应数据
  errors?: string[];                      // 错误列表
  warnings?: string[];                    // 警告列表
  meta?: ResponseMeta;                    // 元数据
}

interface ResponseMeta {
  processingTime: number;    // 处理时间（毫秒）
  timestamp: string;        // 时间戳（ISO 8601）
  path: string;            // 请求路径
  cached: boolean;          // 是否来自缓存
  requestId?: string;       // 请求ID（可选）
}
```

### 5.2 成功响应示例
```json
{
  "status": "success",
  "code": 200,
  "message": "请求成功",
  "data": {
    "User": [
      { "id": 1, "username": "admin" }
    ]
  },
  "meta": {
    "processingTime": 125,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "path": "/apijson",
    "cached": false
  }
}
```

### 5.3 错误响应示例
```json
{
  "status": "error",
  "code": 400,
  "message": "请求验证失败",
  "errors": [
    "表名 \"InvalidTable\" 不符合规范",
    "表 \"User\" 的列配置不正确"
  ],
  "warnings": [],
  "meta": {
    "processingTime": 5,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "path": "/apijson",
    "cached": false
  }
}
```

---

## 8. 错误码说明

| 错误码 | HTTP状态 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 0 | 200 | 成功 | - |
| 1000 | 400 | 未知错误 | 检查请求参数 |
| 1001 | 400 | 请求参数错误 | 检查请求格式 |
| 2000 | 401 | 未授权 | 检查Token或登录 |
| 2001 | 401 | Token过期 | 刷新Token |
| 2002 | 401 | Token无效 | 重新登录获取Token |
| 2003 | 403 | 权限不足 | 联系管理员授权 |
| 3000 | 404 | 数据源不存在 | 检查数据源配置 |
| 3001 | 500 | 数据源连接失败 | 检查网络和数据库状态 |
| 4000 | 400 | 无效查询 | 检查APIJSON语法 |
| 4001 | 400 | 查询超时 | 优化查询或增加超时时间 |
| 4002 | 400 | 查询执行失败 | 检查数据库状态 |
| 5000 | 500 | 工作流不存在 | 检查工作流ID |
| 5001 | 500 | 工作流执行失败 | 查看执行日志 |
| 5002 | 500 | 工作流超时 | 增加超时时间 |

---

## 9. 最佳实践

### 7.1 性能优化

#### 7.1.1 使用缓存
```json
// 启用缓存可以显著提高查询速度
{
  "User": {
    "columns": ["id", "username"],
    "@cache": 300000  // 缓存5分钟
  }
}
```

#### 7.1.2 只查询需要的字段
```json
// 避免查询不需要的字段，减少数据传输量
{
  "User": {
    "columns": ["id", "username"],  // 只查询需要的字段
    "where": { "id": 1 }
  }
}
```

#### 7.1.3 使用索引字段作为条件
```json
// 使用主键或索引字段作为WHERE条件
{
  "User": {
    "where": { "id": { "$in": [1, 2, 3] } }  // 使用索引字段
  }
}
```

#### 7.1.4 合理使用分页
```json
// 避免一次性返回大量数据
{
  "User": {
    "limit": 100,  // 每页最多100条
    "offset": 0
  }
}
```

### 7.2 安全实践

#### 7.2.1 使用HTTPS
```bash
# 生产环境必须使用HTTPS
curl -k https://api.example.com/apijson
```

#### 7.2.2 保护Token
```bash
# 不要在URL中传递Token
# 使用Authorization头
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/apijson
```

#### 7.2.3 输入验证
```json
// 在发送请求前验证输入
{
  "User": {
    "columns": ["id", "username"],  // 确保columns是字符串数组
    "limit": 100,  // 确保limit是正整数
    "offset": 0   // 确保offset是非负整数
  }
}
```

#### 7.2.4 错误处理
```javascript
// 检查响应状态
fetch('/apijson', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(request)
})
.then(response => response.json())
.then(data => {
  if (data.status === 'error') {
    console.error('请求失败:', data.message);
    // 根据错误码进行相应处理
  }
});
```

### 7.3 调试技巧

#### 7.3.1 查看处理时间
```json
// 响应中包含processingTime字段
{
  "status": "success",
  "code": 200,
  "meta": {
    "processingTime": 125  // 处理时间125毫秒
  }
}
```

#### 7.3.2 检查缓存状态
```json
// 响应中包含cached字段
{
  "status": "success",
  "code": 200,
  "meta": {
    "cached": true  // 来自缓存，说明命中缓存
  }
}
```

#### 7.3.3 查看警告信息
```json
// 响应中包含warnings字段
{
  "status": "success",
  "code": 200,
  "warnings": [
    "建议在createdAt字段上添加索引以提高查询性能"
  ]
}
```

### 7.4 完整示例

#### 7.4.1 完整的查询示例
```json
POST /apijson
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "User": {
    "columns": ["id", "username", "email", "createdAt"],
    "where": {
      "status": "active",
      "createdAt": { "$gte": "2024-01-01T00:00:00.000Z" }
    },
    "joins": [
      {
        "type": "LEFT",
        "table": "Profile",
        "alias": "p",
        "on": "User.id = p.userId"
      }
    ],
    "orderBy": ["createdAt-"],
    "limit": 20,
    "offset": 0
  },
  "@cache": 60000,
  "@total": true
}
```

#### 7.4.2 使用curl的示例
```bash
# 简单查询
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"User": {"columns": ["id", "username"]}}'

# 多表查询
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "username"],
      "joins": [
        {
          "type": "LEFT",
          "table": "Profile",
          "on": "User.id = Profile.userId"
        }
      ]
    }
  }'

# 带缓存的查询
curl -X POST http://localhost:3000/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"User": {"columns": ["id"], "@cache": 300000}}'
```

#### 7.4.3 使用JavaScript的示例
```javascript
// 使用fetch API
async function queryAPIJSON(request) {
  const response = await fetch('/apijson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify(request)
  });

  const data = await response.json();

  if (data.status === 'success') {
    console.log('查询成功:', data.data);
    return data.data;
  } else {
    console.error('查询失败:', data.message);
    throw new Error(data.message);
  }
}

// 使用示例
queryAPIJSON({
  User: {
    columns: ['id', 'username', 'email'],
    where: { status: 'active' },
    limit: 10
  }
}).then(data => {
  console.log('用户数据:', data.User);
});
```

#### 7.4.4 使用Axios的示例
```javascript
import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/apijson',
  timeout: 30000,  // 30秒超时
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('apijson_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(response => {
  const data = response.data;
  if (data.status === 'error') {
    console.error('API错误:', data.message);
  }
  return response;
});

// 使用示例
async function getUsers() {
  try {
    const response = await apiClient.post('', {
      User: {
        columns: ['id', 'username'],
        where: { status: 'active' },
        limit: 10
      }
    });
    console.log('用户列表:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('请求失败:', error.message);
    throw error;
  }
}

getUsers();
```

---

## 10. 常见问题

### 8.1 认证相关

**Q: Token过期了怎么办？**
A: 
1. 捕获401错误
2. 使用refreshToken刷新Token
3. 如果refreshToken也过期，需要重新登录

**Q: 如何获取Token？**
A:
1. 调用登录接口：POST /apijson/auth/login
2. 提供username和password
3. 从响应中获取token
4. 将token存储在localStorage或cookie中

### 8.2 查询相关

**Q: 查询很慢怎么办？**
A:
1. 检查是否使用了索引字段作为WHERE条件
2. 减少返回的数据量（使用分页）
3. 使用@cache指令启用缓存
4. 检查数据库连接状态

**Q: 如何处理大量数据？**
A:
1. 使用分页查询，每次只获取部分数据
2. 使用流式返回（如果支持）
3. 考虑导出为文件处理

**Q: JOIN查询返回数据不正确？**
A:
1. 检查JOIN的on条件是否正确
2. 检查表别名是否正确使用
3. 验证表之间的关系是否存在

### 8.3 错误处理

**Q: 收到400错误怎么办？**
A:
1. 检查errors字段中的具体错误信息
2. 根据错误信息修正请求
3. 常见错误：表名不合法、列配置错误、条件语法错误

**Q: 收到401未授权错误？**
A:
1. 检查Token是否有效
2. 检查Token是否过期
3. 确认用户是否有访问权限

**Q: 收到404错误？**
A:
1. 检查API路径是否正确
2. 检查资源是否存在
3. 检查是否有访问权限

---

## 11. 快速参考

### 9.1 APIJSON语法速查表

| 功能 | 语法 |
|--------|------|
| 查询所有 | `{"Table": {}}` |
| 指定字段 | `{"Table": {"columns": ["field1", "field2"]}}` |
| WHERE条件 | `{"Table": {"where": {"field": "value"}}` |
| 大于 | `{"Table": {"where": {"field": {"$gt": 10}}}}` |
| 小于 | `{"Table": {"where": {"field": {"$lt": 10}}}}` |
| 等于 | `{"Table": {"where": {"field": {"$eq": 10}}}}` |
| 不等于 | `{"Table": {"where": {"field": {"$ne": 10}}}}` |
| 在列表中 | `{"Table": {"where": {"field": {"$in": [1, 2, 3]}}}}` |
| 不在列表中 | `{"Table": {"where": {"field": {"$nin": [1, 2, 3]}}}` |
| 模糊查询 | `{"Table": {"where": {"field": {"$like": "%keyword%"}}}` |
| JOIN | `{"Table": {"joins": [{"type": "INNER", "table": "Other", "on": "Table.id = Other.tableId"}]}}` |
| 分组 | `{"Table": {"groupBy": ["field"]}}` |
| 排序 | `{"Table": {"orderBy": ["field+", "field-"]}}` |
| 分页 | `{"Table": {"limit": 20, "offset": 0}}` |
| 缓存 | `{"Table": {}, "@cache": 300000}` |
| 新增 | `{"Table": {"field": "value"}, "@method": "POST"}` |
| 修改 | `{"Table": {"id": 1, "field": "value"}, "@method": "PUT"}` |
| 部分修改 | `{"Table": {"id": 1, "field": "value"}, "@method": "PATCH"}` |
| 删除 | `{"Table": {"id": 1}, "@method": "DELETE"}` |
| 批量新增 | `{"Table[]": [{"field": "value"}], "@method": "POST"}` |
| 批量修改 | `{"Table": {"where": {...}, "field": "value"}, "@method": "PUT"}` |
| 批量删除 | `{"Table": {"where": {...}}, "@method": "DELETE"}` |

### 9.2 HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 12. 版本信息

- **API版本**: 1.0.0
- **文档版本**: v1.0
- **最后更新**: 2024-01-01
- **维护状态**: 正常运行

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01  
**维护团队**: APIJSON平台开发组
