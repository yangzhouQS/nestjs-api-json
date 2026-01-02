# APIJSON NestJS 项目使用指南

## 目录

1. [项目概述](#项目概述)
2. [快速开始](#快速开始)
3. [核心功能](#核心功能)
4. [APIJSON语法](#apijson语法)
5. [使用示例](#使用示例)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

## 项目概述

APIJSON NestJS 是一个基于 NestJS 框架实现的 APIJSON 服务器，提供强大的数据查询和操作能力。

### 主要特性

- ✅ 完整的 APIJSON 语法支持
- ✅ 强大的查询解析和验证
- ✅ 内置认证和授权
- ✅ 详细的日志和性能监控
- ✅ 灵活的缓存策略
- ✅ 完整的 API 文档（Swagger）
- ✅ 全面的单元测试和集成测试

### 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **测试**: Vitest 4.x
- **数据库**: MySQL / PostgreSQL / SQLite
- **缓存**: 内存缓存 / Redis

## 快速开始

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 pnpm
pnpm install

# 使用 yarn
yarn install
```

### 配置环境变量

创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=development
APP_PORT=3000
APP_HOST=0.0.0.0

# 数据库配置
DATABASE_TYPE=sqlite
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=
DATABASE_DATABASE=apijson

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
JWT_ISSUER=apijson-server
JWT_AUDIENCE=apijson-client

# 缓存配置
CACHE_TYPE=memory
CACHE_HOST=localhost
CACHE_PORT=6379
CACHE_PASSWORD=
CACHE_DB=0
CACHE_KEY_PREFIX=apijson:
CACHE_DEFAULT_TTL=300000
CACHE_MAX_SIZE=1000

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# CORS配置
CORS_ORIGIN=*
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_CREDENTIALS=true

# Swagger配置
SWAGGER_ENABLED=true
SWAGGER_TITLE=APIJSON Server API
SWAGGER_DESCRIPTION=基于 NestJS 的 APIJSON 服务器实现
SWAGGER_VERSION=1.0.0
SWAGGER_PATH=docs

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### 启动应用

```bash
# 开发模式
npm run start:debug

# 生产模式
npm run build
npm run start:prod
```

### 访问API文档

启动应用后，访问 Swagger 文档：

```
http://localhost:3000/api/docs
```

## 核心功能

### 1. 请求解析（Parser）

将 APIJSON 请求解析为内部结构：

```json
{
  "User": {
    "columns": ["id", "name", "email"],
    "where": { "id": 1 },
    "limit": 10
  }
}
```

### 2. 请求验证（Verifier）

验证请求的合法性：

- 表名验证
- 列名验证
- 条件验证
- 连接验证
- 分页验证

### 3. SQL构建（Builder）

将解析后的请求构建为 SQL 查询：

```sql
SELECT id, name, email FROM User WHERE id = 1 LIMIT 10
```

### 4. 查询执行（Executor）

执行构建的 SQL 查询并返回结果。

### 5. 缓存管理（Cache）

支持内存缓存和 Redis 缓存，提高查询性能。

### 6. 认证授权（Auth）

- JWT Token 认证
- 基于角色的访问控制（RBAC）
- 基于权限的访问控制（PBAC）

## APIJSON语法

### 基本查询

```json
{
  "User": {
    "columns": ["id", "name", "email"],
    "where": { "status": "active" },
    "limit": 10,
    "offset": 0
  }
}
```

### 条件查询

#### 简单条件

```json
{
  "User": {
    "where": {
      "id": 1,
      "status": "active"
    }
  }
}
```

#### 比较操作符

```json
{
  "User": {
    "where": {
      "age": { "$gt": 18 },
      "createdAt": { "$gte": "2024-01-01" },
      "score": { "$lt": 100 },
      "updatedAt": { "$lte": "2024-12-31" },
      "status": { "$ne": "deleted" },
      "name": { "$eq": "John" }
    }
  }
}
```

#### 数组操作符

```json
{
  "User": {
    "where": {
      "id": { "$in": [1, 2, 3] },
      "status": { "$nin": ["deleted", "banned"] }
    }
  }
}
```

#### 模糊查询

```json
{
  "User": {
    "where": {
      "name": { "$like": "%John%" },
      "email": { "$ilike": "%@example.com" }
    }
  }
}
```

#### 逻辑操作符

```json
{
  "User": {
    "where": {
      "$and": [
        { "status": "active" },
        { "age": { "$gt": 18 } }
      ]
    }
  }
}
```

```json
{
  "User": {
    "where": {
      "$or": [
        { "status": "active" },
        { "status": "pending" }
      ]
    }
  }
}
```

```json
{
  "User": {
    "where": {
      "$not": { "status": "deleted" }
    }
  }
}
```

### 排序

```json
{
  "User": {
    "order": ["name+", "createdAt-"]
  }
}
```

- `name+`: 升序（ASC）
- `createdAt-`: 降序（DESC）

### 分页

```json
{
  "User": {
    "limit": 20,
    "offset": 40
  }
}
```

### 分组

```json
{
  "User": {
    "columns": ["department", "COUNT(*) as count"],
    "group": ["department"]
  }
}
```

### 分组过滤

```json
{
  "User": {
    "columns": ["department", "COUNT(*) as count"],
    "group": ["department"],
    "having": { "count": { "$gt": 5 } }
  }
}
```

### 连接查询

```json
{
  "User": {
    "columns": ["User.id", "User.name", "Profile.bio"],
    "joins": [
      {
        "type": "INNER",
        "table": "Profile",
        "on": "User.id = Profile.userId"
      }
    ]
  }
}
```

支持的连接类型：
- `INNER`: 内连接
- `LEFT`: 左连接
- `RIGHT`: 右连接
- `FULL`: 全连接
- `CROSS`: 交叉连接

### 指令

#### @method

指定 HTTP 方法：

```json
{
  "User": { "columns": ["id"] },
  "@method": "GET"
}
```

#### @page / @limit / @offset

分页指令：

```json
{
  "User": { "columns": ["id"] },
  "@page": 1,
  "@limit": 10,
  "@offset": 0
}
```

#### @cache

缓存控制：

```json
{
  "User": { "columns": ["id"] },
  "@cache": true
}
```

或指定缓存时间（毫秒）：

```json
{
  "User": { "columns": ["id"] },
  "@cache": 300000
}
```

#### @total / @count

返回总数：

```json
{
  "User": { "columns": ["id"] },
  "@total": true,
  "@count": true
}
```

#### @search

全文搜索：

```json
{
  "User": { "columns": ["id"] },
  "@search": "keyword"
}
```

## 使用示例

### 示例1：获取用户列表

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "name", "email", "createdAt"],
      "where": { "status": "active" },
      "order": ["createdAt-"],
      "limit": 20,
      "offset": 0
    }
  }'
```

### 示例2：获取单个用户

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "name", "email"],
      "where": { "id": 1 }
    }
  }'
```

### 示例3：复杂条件查询

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "name", "email"],
      "where": {
        "$and": [
          { "status": "active" },
          {
            "$or": [
              { "age": { "$gt": 18 } },
              { "parentConsent": true }
            ]
          }
        ]
      },
      "order": ["name+"],
      "limit": 10
    }
  }'
```

### 示例4：连接查询

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["User.id", "User.name", "Profile.bio"],
      "joins": [
        {
          "type": "LEFT",
          "table": "Profile",
          "on": "User.id = Profile.userId"
        }
      ],
      "limit": 10
    }
  }'
```

### 示例5：分组统计

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["department", "COUNT(*) as userCount"],
      "group": ["department"],
      "having": { "userCount": { "$gt": 5 } },
      "order": ["userCount-"]
    }
  }'
```

### 示例6：多表查询

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "name"],
      "limit": 10
    },
    "Product": {
      "columns": ["id", "name", "price"],
      "where": { "status": "available" },
      "limit": 20
    }
  }'
```

### 示例7：使用指令

```bash
curl -X POST http://localhost:3000/api/apijson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "User": {
      "columns": ["id", "name"],
      "limit": 10
    },
    "@method": "GET",
    "@cache": true,
    "@total": true
  }'
```

## 最佳实践

### 1. 安全性

#### 使用HTTPS

生产环境必须使用HTTPS：

```env
# .env
CORS_ORIGIN=https://yourdomain.com
```

#### 保护敏感数据

不要在查询中返回敏感信息：

```json
{
  "User": {
    "columns": ["id", "name"],
    "where": { "id": 1 }
  }
}
```

#### 使用JWT Token

始终在请求头中包含有效的JWT Token：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 性能优化

#### 使用缓存

对于频繁访问的数据，启用缓存：

```json
{
  "User": {
    "columns": ["id", "name"]
  },
  "@cache": true
}
```

#### 限制返回字段

只查询需要的字段：

```json
{
  "User": {
    "columns": ["id", "name"]
  }
}
```

#### 使用分页

避免一次性查询大量数据：

```json
{
  "User": {
    "limit": 20,
    "offset": 0
  }
}
```

#### 使用索引

确保查询字段有适当的数据库索引。

### 3. 错误处理

#### 检查响应状态

```javascript
const response = await fetch('/api/apijson', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(request)
});

if (response.status !== 200) {
  console.error('请求失败:', await response.json());
}
```

#### 处理验证错误

```json
{
  "status": "error",
  "code": 400,
  "message": "APIJSON请求验证失败",
  "errors": [
    "表名 \"@InvalidTable\" 不符合规范"
  ]
}
```

### 4. 调试

#### 查看日志

应用会记录详细的日志信息：

```bash
# 控制台输出
npm run start:debug
```

#### 查看性能指标

响应包含处理时间：

```json
{
  "status": "success",
  "code": 200,
  "processingTime": 45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 查看缓存状态

响应头包含缓存状态：

```
X-Cache: HIT
X-Cache: MISS
```

## 常见问题

### Q1: 如何获取JWT Token？

A: 需要实现登录接口，验证用户凭据后返回JWT Token。

### Q2: 如何处理大量数据？

A: 使用分页和缓存：

```json
{
  "User": {
    "limit": 100,
    "offset": 0
  },
  "@cache": true
}
```

### Q3: 如何实现全文搜索？

A: 使用 `@search` 指令或 `$like` 操作符：

```json
{
  "User": {
    "where": {
      "name": { "$like": "%keyword%" }
    }
  },
  "@search": "keyword"
}
```

### Q4: 如何处理并发请求？

A: 使用缓存和适当的限流配置：

```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### Q5: 如何调试SQL查询？

A: 查看应用日志，会记录生成的SQL查询。

### Q6: 如何自定义错误响应？

A: 实现自定义异常过滤器，继承 [`APIJSONExceptionFilter`](src/common/filters/apijson-exception.filter.ts:1)。

### Q7: 如何添加自定义指令？

A: 在 [`ParserService`](src/modules/parser/parser.service.ts:1) 中注册新的指令解析器。

### Q8: 如何切换数据库类型？

A: 修改 `.env` 文件中的 `DATABASE_TYPE` 配置：

```env
DATABASE_TYPE=mysql
# 或
DATABASE_TYPE=postgres
# 或
DATABASE_TYPE=sqlite
```

### Q9: 如何禁用缓存？

A: 在请求中使用 `@cache: false` 指令：

```json
{
  "User": { "columns": ["id"] },
  "@cache": false
}
```

### Q10: 如何处理认证失败？

A: 检查Token是否有效，是否过期：

```javascript
try {
  const response = await fetch('/api/apijson', {
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  });
} catch (error) {
  if (error.status === 401) {
    // Token无效或过期，重新登录
  }
}
```

## 测试

### 运行单元测试

```bash
# 运行所有单元测试
npm run test:unit

# 运行特定模块测试
npm run test:unit -- parser

# 监听模式
npm run test:watch
```

### 运行端到端测试

```bash
# 运行所有E2E测试
npm run test:e2e
```

### 生成覆盖率报告

```bash
npm run test:cov
```

覆盖率报告将生成在 `coverage/` 目录。

## 相关文档

- [测试策略文档](./testing-strategy.md)
- [测试培训文档](./testing-training.md)
- [API 官方文档](https://github.com/Tencent/APIJSON)
- [NestJS 文档](https://docs.nestjs.com/)

## 支持

如有问题，请提交 Issue 或 Pull Request。
