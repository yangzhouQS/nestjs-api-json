# APIJSON for NestJS

APIJSON 是一种专为 API 而设计的 JSON 传输结构协议，它可以让前端开发者像写 SQL 一样灵活地请求和操作数据库，而无需后端编写任何接口代码。

本项目是 APIJSON 的 NestJS + TypeScript 实现，支持 MySQL 数据库，提供了完整的 CRUD 操作、JOIN 查询、子查询、聚合函数、事务管理等高级功能。

## 特性

- ✅ **完整的 CRUD 操作**：支持 GET、GETS、HEAD、HEADS、POST、PUT、DELETE、CRUD 等请求方法
- ✅ **灵活的查询条件**：支持各种 WHERE 操作符（=、!=、>、<、>=、<=、IN、NOT IN、BETWEEN、LIKE 等）
- ✅ **JOIN 查询**：支持多种 JOIN 类型（APP、INNER、LEFT、RIGHT、FULL、OUTER 等）
- ✅ **高级特性**：
  - 子查询
  - 聚合函数（COUNT、SUM、AVG、MIN、MAX）
  - 分组查询（GROUP BY）
  - 事务管理
- ✅ **权限管理**：
  - 基于 Redis 的用户认证
  - 表级权限控制
  - 列级权限控制
  - 角色权限管理
- ✅ **安全性**：
  - 参数化查询防止 SQL 注入
  - 请求验证
  - 速率限制
- ✅ **日志记录**：集成 Winston 日志系统
- ✅ **错误处理**：统一的错误处理和响应格式
- ✅ **性能优化**：连接池管理、查询缓存
- ✅ **完整的测试**：单元测试和 E2E 测试

## 项目结构

```
nestjs-apijson/
├── src/
│   ├── common/              # 公共模块
│   │   ├── decorators/      # 装饰器
│   │   ├── filters/         # 异常过滤器
│   │   ├── guards/          # 守卫
│   │   ├── interceptors/     # 拦截器
│   │   └── pipes/          # 管道
│   ├── config/              # 配置模块
│   ├── controllers/         # 控制器
│   ├── interfaces/          # 接口定义
│   ├── modules/            # 功能模块
│   │   ├── advanced/        # 高级特性模块
│   │   ├── builder/         # SQL 构建器模块
│   │   ├── cache/           # 缓存模块
│   │   ├── database/        # 数据库模块
│   │   ├── executor/        # SQL 执行器模块
│   │   ├── parser/          # 解析器模块
│   │   ├── permission/      # 权限管理模块
│   │   └── verifier/        # 验证器模块
│   ├── types/              # 类型定义
│   ├── app.module.ts        # 应用主模块
│   └── main.ts             # 应用入口
├── test/                   # 测试文件
│   ├── e2e/               # E2E 测试
│   ├── setup.ts            # 测试设置
│   └── utils/              # 测试工具
├── .env.example            # 环境变量示例
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 文件为 `.env`，并根据你的环境修改配置：

```bash
cp .env.example .env
```

主要配置项：

```env
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=apijson

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### 启动应用

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 运行测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 使用指南

### 基本请求

#### 1. 单表查询（GET）

```bash
POST /apijson/get
Content-Type: application/json

{
  "User": {
    "id": 1
  }
}
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "User": {
      "id": 1,
      "name": "张三",
      "age": 25
    }
  }
}
```

#### 2. 多表查询（GETS）

```bash
POST /apijson/gets
Content-Type: application/json

{
  "User[]": {
    "id": {">=": 1},
    "@order": "id-",
    "@limit": 10
  }
}
```

#### 3. 计数查询（HEAD）

```bash
POST /apijson/head
Content-Type: application/json

{
  "User": {
    "id": {">=": 1}
  }
}
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "User": 100
  }
}
```

#### 4. 创建数据（POST）

```bash
POST /apijson/post
Content-Type: application/json

{
  "User": {
    "name": "李四",
    "age": 30
  }
}
```

#### 5. 更新数据（PUT）

```bash
POST /apijson/put
Content-Type: application/json

{
  "User": {
    "id": 1,
    "name": "王五"
  }
}
```

#### 6. 删除数据（DELETE）

```bash
POST /apijson/delete
Content-Type: application/json

{
  "User": {
    "id": 1
  }
}
```

#### 7. 混合操作（CRUD）

```bash
POST /apijson/crud
Content-Type: application/json

{
  "User": {
    "id": 1,
    "name": "更新用户"
  },
  "Comment[]": {
    "userId": 1
  },
  "Moment": {
    "id": 1,
    "@delete": true
  }
}
```

### 高级查询

#### WHERE 操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `=` | 等于 | `{"id": 1}` |
| `!=` | 不等于 | `{"id!": 1}` |
| `>` | 大于 | `{"age>": 20}` |
| `<` | 小于 | `{"age<": 30}` |
| `>=` | 大于等于 | `{"age>=": 20}` |
| `<=` | 小于等于 | `{"age<=": 30}` |
| `{}` | IN | `{"id{}": [1, 2, 3]}` |
| `!{}` | NOT IN | `{"id!{}": [1, 2, 3]}` |
| `><` | BETWEEN | `{"age><": [20, 30]}` |
| `!><` | NOT BETWEEN | `{"age!><": [20, 30]}` |
| `~` | LIKE | `{"name~": "张"}` |
| `!~` | NOT LIKE | `{"name!~": "张"}` |

#### JOIN 查询

```bash
POST /apijson/get
Content-Type: application/json

{
  "User": {
    "id": 1,
    "Comment@": {
      "userId": 1
    }
  }
}
```

JOIN 类型：

- `@` - APP JOIN（LEFT JOIN）
- `&` - INNER JOIN
- `|` - FULL JOIN
- `<` - LEFT JOIN
- `>` - RIGHT JOIN
- `!` - OUTER JOIN
- `^` - SIDE JOIN
- `()` - ANTI JOIN
- `()` - FOREIGN JOIN
- `~` - ASOF JOIN

#### 排序

```bash
{
  "User[]": {
    "@order": "id+,name-"
  }
}
```

`+` 表示升序，`-` 表示降序。

#### 分页

```bash
{
  "User[]": {
    "@limit": 10,
    "@offset": 20
  }
}
```

#### 列选择

```bash
{
  "User": {
    "id": 1,
    "@column": "id,name,age"
  }
}
```

#### 分组查询

```bash
{
  "User[]": {
    "@group": "department",
    "COUNT(id)": "count"
  }
}
```

### 高级特性

#### 子查询

```bash
POST /advanced/subquery
Content-Type: application/json

{
  "subqueries": [
    {
      "alias": "user_count",
      "tableName": "User",
      "where": {"id": {">=": 1}}
    }
  ]
}
```

#### 聚合函数

```bash
POST /advanced/aggregate
Content-Type: application/json

{
  "tableName": "User",
  "aggregateFunction": "COUNT",
  "column": "id",
  "where": {"age": {">": 20}}
}
```

支持的聚合函数：COUNT、SUM、AVG、MIN、MAX

#### 分组聚合

```bash
POST /advanced/group-aggregate
Content-Type: application/json

{
  "tableName": "User",
  "groupBy": ["department"],
  "aggregateFunctions": {
    "COUNT(id)": "COUNT(`id`)",
    "AVG(age)": "AVG(`age`)"
  }
}
```

#### 事务

```bash
POST /advanced/transaction
Content-Type: application/json

{
  "queries": [
    {
      "tableName": "User",
      "operation": "INSERT",
      "data": {"name": "用户1", "age": 25}
    },
    {
      "tableName": "User",
      "operation": "INSERT",
      "data": {"name": "用户2", "age": 30}
    }
  ]
}
```

### 权限管理

#### 获取表权限

```bash
GET /permission/tables
```

#### 设置表权限

```bash
POST /permission/tables/User
Content-Type: application/json

{
  "roles": ["ADMIN"],
  "canSelect": true,
  "canInsert": true,
  "canUpdate": true,
  "canDelete": true
}
```

#### 检查用户权限

```bash
POST /permission/check
Content-Type: application/json

{
  "userId": "user123",
  "tableName": "User",
  "operation": "SELECT"
}
```

#### 批量检查权限

```bash
POST /permission/check-batch
Content-Type: application/json

{
  "userId": "user123",
  "tableOperations": [
    {"tableName": "User", "operation": "SELECT"},
    {"tableName": "Comment", "operation": "INSERT"}
  ]
}
```

## API 文档

### 基础 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/apijson/get` | POST | 单表查询 |
| `/apijson/gets` | POST | 多表查询 |
| `/apijson/head` | POST | 计数查询 |
| `/apijson/heads` | POST | 多表计数 |
| `/apijson/post` | POST | 创建数据 |
| `/apijson/put` | POST | 更新数据 |
| `/apijson/delete` | POST | 删除数据 |
| `/apijson/crud` | POST | 混合操作 |

### 高级特性端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/advanced/subquery` | POST | 执行子查询 |
| `/advanced/aggregate` | POST | 执行聚合函数 |
| `/advanced/group-aggregate` | POST | 执行分组聚合 |
| `/advanced/transaction` | POST | 执行事务 |

### 权限管理端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/permission/tables` | GET | 获取所有表权限 |
| `/permission/tables/:tableName` | POST | 设置表权限 |
| `/permission/check` | POST | 检查用户权限 |
| `/permission/check-batch` | POST | 批量检查权限 |
| `/permission/users/:userId` | GET | 获取用户权限 |
| `/permission/users/:userId` | POST | 设置用户权限 |

### 其他端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |

## 响应格式

所有 API 响应都遵循统一的格式：

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 响应数据
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "User.id",
      "message": "id 不能为空"
    }
  ]
}
```

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 配置说明

### 应用配置

- `NODE_ENV` - 运行环境（development/production）
- `PORT` - 服务端口
- `API_PREFIX` - API 路径前缀
- `GLOBAL_PREFIX` - 全局路由前缀

### 数据库配置

- `DB_HOST` - 数据库主机
- `DB_PORT` - 数据库端口
- `DB_USERNAME` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_DATABASE` - 数据库名称
- `DB_SYNCHRONIZE` - 是否同步数据库结构
- `DB_LOGGING` - 是否记录 SQL 日志

### Redis 配置

- `REDIS_HOST` - Redis 主机
- `REDIS_PORT` - Redis 端口
- `REDIS_PASSWORD` - Redis 密码
- `REDIS_DB` - Redis 数据库编号

### JWT 配置

- `JWT_SECRET` - JWT 密钥
- `JWT_EXPIRES_IN` - JWT 过期时间

### 日志配置

- `LOG_LEVEL` - 日志级别
- `LOG_FILE` - 日志文件路径

## 开发指南

### 添加新的模块

1. 在 `src/modules/` 下创建新模块目录
2. 创建模块文件、服务文件、控制器文件
3. 在 `app.module.ts` 中导入新模块

### 添加新的装饰器

在 `src/common/decorators/` 下创建装饰器文件：

```typescript
import { SetMetadata } from '@nestjs/common';

export const MY_DECORATOR_KEY = 'myDecorator';

export const MyDecorator = (data?: any) => SetMetadata(MY_DECORATOR_KEY, data);
```

### 添加新的守卫

在 `src/common/guards/` 下创建守卫文件：

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class MyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 守卫逻辑
    return true;
  }
}
```

### 添加新的拦截器

在 `src/common/interceptors/` 下创建拦截器文件：

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class MyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 拦截器逻辑
    return next.handle();
  }
}
```

## 测试

### 单元测试

单元测试位于各个模块的 `.spec.ts` 文件中。

运行单元测试：

```bash
npm run test
```

### E2E 测试

E2E 测试位于 `test/e2e/` 目录中。

运行 E2E 测试：

```bash
npm run test:e2e
```

### 测试覆盖率

生成测试覆盖率报告：

```bash
npm run test:cov
```

## 性能优化

1. **连接池管理**：使用数据库连接池提高性能
2. **查询缓存**：使用 Redis 缓存查询结果
3. **索引优化**：为常用查询字段添加索引
4. **批量操作**：使用批量插入、更新、删除减少数据库操作
5. **分页查询**：避免一次性查询大量数据

## 安全建议

1. **使用 HTTPS**：在生产环境中使用 HTTPS
2. **强密码策略**：设置强密码并定期更换
3. **SQL 注入防护**：使用参数化查询
4. **XSS 防护**：对用户输入进行过滤和转义
5. **CSRF 防护**：使用 CSRF Token
6. **速率限制**：防止暴力攻击
7. **日志监控**：监控异常日志及时发现安全问题

## 常见问题

### 1. 如何处理大数据量查询？

使用分页查询：

```json
{
  "User[]": {
    "@limit": 100,
    "@offset": 0
  }
}
```

### 2. 如何优化查询性能？

- 添加适当的索引
- 使用分页查询
- 避免使用 `SELECT *`
- 使用查询缓存

### 3. 如何处理事务？

使用事务端点：

```bash
POST /advanced/transaction
```

### 4. 如何配置权限？

使用权限管理端点配置表权限和用户权限。

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

## 致谢

感谢 APIJSON 原作者的开源贡献。

## 更新日志

### v1.0.0 (2024-01-01)

- 初始版本发布
- 实现完整的 CRUD 操作
- 支持 JOIN 查询
- 实现高级特性（子查询、聚合函数、事务）
- 实现权限管理
- 完善的测试覆盖
