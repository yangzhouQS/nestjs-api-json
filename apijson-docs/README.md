# APIJSONORM 项目文档

## 文档目录

本文档提供了 APIJSONORM 项目的完整使用指南，包括项目概述、核心功能模块、请求方法、配置指南、高级特性、多表关联查询、API 设计实现和最佳实践。

### 文档列表

1. **[项目概述](./01-项目概述.md)**
   - 项目简介
   - 核心特性
   - 项目架构
   - 核心组件
   - 核心功能模块
   - 请求方法
   - 数据库支持
   - 使用场景
   - 项目优势

2. **[核心功能模块详解](./02-核心功能模块详解.md)**
   - Parser 解析模块
   - SQLConfig SQL 生成模块
   - SQLExecutor SQL 执行模块
   - Verifier 验证模块
   - JSON 处理模块

3. **[请求方法详解](./03-请求方法详解.md)**
   - GET 方法
   - GETS 方法
   - HEAD 方法
   - POST 方法
   - PUT 方法
   - DELETE 方法
   - CRUD 方法
   - 条件运算符
   - 特殊字段
   - 引用赋值

4. **[配置指南](./04-配置指南.md)**
   - 基础配置
   - 核心配置类
   - 数据源配置
   - 验证器配置
   - 函数解析器配置
   - Spring Boot 集成配置
   - 数据库特定配置
   - 缓存配置
   - 性能优化配置
   - 安全配置
   - 日志配置

5. **[高级特性](./05-高级特性.md)**
   - JOIN 查询
   - 子查询
   - 聚合函数
   - 远程函数调用
   - 脚本执行
   - 事务管理
   - 缓存机制
   - 批量操作
   - 引用赋值
   - 执行计划

6. **[多表关联查询语法](./07-多表关联查询语法.md)**
   - 核心概念
   - 基础关联查询
   - 复杂关联查询
   - JOIN 查询
   - APP JOIN（应用层关联）
   - 子查询关联
   - 高级关联技巧
   - 性能优化建议
   - 常见场景示例
   - 错误处理
   - 最佳实践

7. **[最佳实践](./06-最佳实践.md)**
   - 项目结构
   - 数据库设计
   - 请求设计
   - 性能优化
   - 安全实践
   - 错误处理
   - 测试实践
   - 日志记录
   - 部署实践
   - 代码规范
   - 版本管理

8. **[APIJSONORM 功能及 API 设计实现](./12-APIJSONORM功能及API设计实现.md)** ⭐
   - 概述
   - 核心架构
   - 核心接口（Parser、ObjectParser、SQLConfig、SQLExecutor、Verifier、FunctionParser）
   - 请求方法（GET、HEAD、GETS、HEADS、POST、PUT、DELETE、CRUD）
   - 条件运算符（比较、逻辑、模糊匹配、范围、数组）
   - 特殊字段（查询字段、数组字段、全局字段）
   - JOIN 查询（Join 类、支持的 JOIN 类型、使用示例）
   - 子查询（Subquery 类、子查询类型、使用示例）
   - 函数调用（函数类型、调用时机、使用示例）
   - 引用赋值（引用语法、路径格式、使用示例）
   - 数组查询（数组查询语法、使用示例）
   - 聚合函数（支持的聚合函数、使用示例）
   - 数据库支持（支持的数据库类型、数据库适配实现）
   - 高级特性（缓存机制、事务管理、批量操作、权限控制）
   - 核心抽象类（AbstractParser、AbstractObjectParser、AbstractSQLConfig、AbstractSQLExecutor、AbstractVerifier、AbstractFunctionParser）
   - 模型类（Table、Column、Request、Document）
   - JSON 工具类（JSON、JSONRequest、JSONResponse）
   - 异常处理（异常类、异常类型）
   - 配置选项（Parser、SQLConfig、Verifier、FunctionParser 配置）

## 快速开始

### 1. 添加依赖

**Maven:**
```xml
<dependency>
    <groupId>com.github.Tencent</groupId>
    <artifactId>APIJSON</artifactId>
    <version>8.1.0</version>
</dependency>
```

**Gradle:**
```gradle
dependencies {
    implementation 'com.github.Tencent:APIJSON:8.1.0'
}
```

### 2. 配置数据源

```java
public class DemoSQLExecutor extends AbstractSQLExecutor {

    @Override
    public Connection getConnection() throws SQLException {
        String url = "jdbc:mysql://localhost:3306/test";
        String username = "root";
        String password = "password";
        
        return DriverManager.getConnection(url, username, password);
    }
}
```

### 3. 创建 Parser

```java
public class DemoParser extends AbstractParser {

    @Override
    public SQLExecutor createSQLExecutor() {
        return new DemoSQLExecutor();
    }

    @Override
    public Verifier createVerifier() {
        return new DemoVerifier();
    }
}
```

### 4. 执行请求

```java
// 创建 Parser
Parser parser = new DemoParser();

// 执行 GET 请求
String request = "{\"User\": {\"id\": 1}}";
String response = parser.parse(request);

System.out.println(response);
```

## 示例请求

### 查询单个用户

```json
{
  "User": {
    "id": 1
  }
}
```

### 查询用户列表

```json
{
  "User[]": {
    "count": 10,
    "page": 0,
    "User": {
      "age>": 18
    }
  }
}
```

### 新增用户

```json
{
  "User": {
    "name": "张三",
    "age": 25
  }
}
```

### 更新用户

```json
{
  "User": {
    "id": 1,
    "name": "李四",
    "age": 30
  }
}
```

### 删除用户

```json
{
  "User": {
    "id": 1
  }
}
```

### JOIN 查询

```json
{
  "Moment": {
    "userId": 82001
  },
  "join": "@/User/id@"
}
```

## 核心特性

- **零 SQL 编写**：通过 JSON 直接操作数据库
- **自动 SQL 生成**：根据 JSON 请求自动生成 SQL
- **多数据库支持**：支持 MySQL、PostgreSQL、Oracle、SQL Server 等
- **权限控制**：内置基于角色的访问控制
- **请求验证**：支持请求结构验证和内容验证
- **复杂查询**：支持 JOIN、子查询、聚合函数等
- **远程函数**：支持远程调用自定义函数
- **事务管理**：内置事务支持
- **结果缓存**：支持 SQL 结果缓存

## 支持的数据库

- MySQL
- PostgreSQL
- Oracle
- SQL Server
- MongoDB
- ClickHouse
- TiDB
- 其他支持 JDBC 的数据库

## 相关链接

- GitHub: https://github.com/Tencent/APIJSON
- 官方文档: https://github.com/Tencent/APIJSON/blob/master/Document.md
- 在线测试: http://apijson.cn/unit

## 许可证

APIJSONORM 使用 Apache License 2.0 开源协议。

## 贡献

欢迎贡献代码、报告问题或提出建议。请访问 GitHub 仓库了解更多信息。

## 联系方式

- GitHub Issues: https://github.com/Tencent/APIJSON/issues
- 邮箱: lemon@tencent.com

---

**注意**：本文档基于 APIJSONORM 8.1.0 版本编写，不同版本可能存在差异。
