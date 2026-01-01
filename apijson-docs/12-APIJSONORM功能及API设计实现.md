# APIJSONORM 功能及 API 设计实现

## 1. 概述

APIJSONORM 是腾讯开源的一个基于 JSON 的 ORM（对象关系映射）框架,它提供了一种创新的数据库操作方式。本文档详细梳理了 APIJSONORM 的所有功能及其 API 设计实现。

## 2. 核心架构

### 2.1 架构层次

```
┌─────────────────────────────────────────┐
│         客户端 JSON 请求               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Parser 层（解析层）             │
│  - AbstractParser                      │
│  - AbstractObjectParser                │
│  - AbstractFunctionParser              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Verifier 层（验证层）              │
│  - AbstractVerifier                    │
│  - 权限验证                            │
│  - 内容验证                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    SQLConfig 层（SQL 配置层）          │
│  - AbstractSQLConfig                   │
│  - SQL 生成                            │
│  - 数据库适配                          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   SQLExecutor 层（SQL 执行层）         │
│  - AbstractSQLExecutor                 │
│  - SQL 执行                            │
│  - 结果处理                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         数据库                          │
│  MySQL / PostgreSQL / Oracle / ...     │
└─────────────────────────────────────────┘
```

### 2.2 核心接口

#### 2.2.1 Parser 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/Parser.java`](APIJSONORM/src/main/java/apijson/orm/Parser.java)

```java
public interface Parser<T, M extends Map<String, Object>, L extends List<Object>> {
    // 核心解析方法
    M parseResponse(M request) throws Exception;
    
    // 对象和数组解析
    ObjectParser<T, M, L> onObjectParse(M request, String parentPath, String name, 
                                           SQLConfig<T, M, L> arrayConfig, 
                                           boolean isSubquery, M cache) throws Exception;
    L onArrayParse(M request, String parentPath, String name, 
                  boolean isSubquery, L cache) throws Exception;
    
    // JOIN 解析
    List<Join<T, M, L>> onJoinParse(Object join, M request) throws Exception;
    
    // 路径值获取
    Object getValueByPath(String path);
    void putQueryResult(String path, Object result);
    
    // 验证相关
    void onVerifyRole(SQLConfig<T, M, L> config) throws Exception;
    
    // 创建组件
    SQLExecutor<T, M, L> createSQLExecutor();
    Verifier<T, M, L> createVerifier();
    FunctionParser<T, M, L> createFunctionParser();
    SQLConfig<T, M, L> createSQLConfig();
}
```

#### 2.2.2 ObjectParser 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/ObjectParser.java`](APIJSONORM/src/main/java/apijson/orm/ObjectParser.java)

```java
public interface ObjectParser<T, M extends Map<String, Object>, L extends List<Object>> {
    // 解析方法
    ObjectParser<T, M, L> parse(String name, boolean isReuse) throws Exception;
    M parseResponse(RequestMethod method, String table, String alias, 
                  M request, List<Join<T, M, L>> joinList, 
                  boolean isProcedure) throws Exception;
    M parseResponse(SQLConfig<T, M, L> config, boolean isProcedure) throws Exception;
    
    // 成员解析
    boolean onParse(@NotNull String key, @NotNull Object value) throws Exception;
    Object onChildParse(int index, String key, M value, Object cache) throws Exception;
    Object onReferenceParse(@NotNull String path);
    
    // 数组解析
    void onPUTArrayParse(@NotNull String key, @NotNull L array) throws Exception;
    void onTableArrayParse(@NotNull String key, @NotNull L array) throws Exception;
    
    // SQL 配置和执行
    ObjectParser<T, M, L> setSQLConfig() throws Exception;
    ObjectParser<T, M, L> setSQLConfig(int count, int page, int position) throws Exception;
    ObjectParser<T, M, L> executeSQL() throws Exception;
    M onSQLExecute() throws Exception;
    M response() throws Exception;
    
    // 函数和子对象响应
    void onFunctionResponse(String type) throws Exception;
    void onChildResponse() throws Exception;
    
    // 创建 SQLConfig
    SQLConfig<T, M, L> newSQLConfig(boolean isProcedure) throws Exception;
    SQLConfig<T, M, L> newSQLConfig(RequestMethod method, String table, String alias,
                                     M request, List<Join<T, M, L>> joinList,
                                     boolean isProcedure) throws Exception;
    
    // 回收内存
    void recycle();
    void onComplete();
}
```

#### 2.2.3 SQLConfig 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/SQLConfig.java`](APIJSONORM/src/main/java/apijson/orm/SQLConfig.java)

```java
public interface SQLConfig<T, M extends Map<String, Object>, L extends List<Object>> {
    // 数据库类型
    String getDatabase();
    SQLConfig<T, M, L> setDatabase(String database);
    
    // 表和别名
    String getTable();
    SQLConfig<T, M, L> setTable(String table);
    String getAlias();
    SQLConfig<T, M, L> setAlias(String alias);
    
    // 请求方法
    RequestMethod getMethod();
    SQLConfig<T, M, L> setMethod(RequestMethod method);
    
    // SQL 生成
    String getSQL(boolean prepared) throws Exception;
    String getSQL(boolean prepared, boolean withSQL) throws Exception;
    
    // 子句生成
    String getWhereString(boolean prepared) throws Exception;
    String getJoinString(boolean prepared) throws Exception;
    String getGroupString() throws Exception;
    String getHavingString(boolean prepared) throws Exception;
    String getOrderString() throws Exception;
    
    // 分页
    int getCount();
    SQLConfig<T, M, L> setCount(int count);
    int getPage();
    SQLConfig<T, M, L> setPage(int page);
    int getPosition();
    SQLConfig<T, M, L> setPosition(int position);
    
    // JOIN
    List<Join<T, M, L>> getJoinList();
    SQLConfig<T, M, L> setJoinList(List<Join<T, M, L>> joinList);
    
    // 组件引用
    Parser<T, M, L> getParser();
    SQLConfig<T, M, L> setParser(Parser<T, M, L> parser);
    ObjectParser<T, M, L> getObjectParser();
    SQLConfig<T, M, L> setObjectParser(ObjectParser<T, M, L> objectParser);
    
    // 类型
    int getType();
    SQLConfig<T, M, L> setType(int type);
    
    // 数据库配置
    String getDatasource();
    String getDatabase();
    String getSchema();
    String getCatalog();
    String getNamespace();
}
```

#### 2.2.4 SQLExecutor 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/SQLExecutor.java`](APIJSONORM/src/main/java/apijson/orm/SQLExecutor.java)

```java
public interface SQLExecutor<T, M extends Map<String, Object>, L extends List<Object>> {
    // SQL 执行
    M execute(SQLConfig<T, M, L> config, boolean isSubquery) throws Exception;
    List<Map<String, Object>> executeQuery(String sql, List<Object> values) throws Exception;
    int executeUpdate(String sql, List<Object> values) throws Exception;
    
    // 缓存管理
    M getCache(String key);
    void putCache(String key, M value);
    void removeCache(String key);
    void clearCache();
    
    // 事务管理
    void begin(int transactionIsolation) throws Exception;
    void commit() throws Exception;
    void rollback() throws Exception;
    void rollback(Savepoint savepoint) throws Exception;
    Savepoint setSavepoint(String name) throws Exception;
    
    // 数据库连接
    Connection getConnection() throws Exception;
    void closeConnection(Connection connection) throws Exception;
}
```

#### 2.2.5 Verifier 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/Verifier.java`](APIJSONORM/src/main/java/apijson/orm/Verifier.java)

```java
public interface Verifier<T, M extends Map<String, Object>, L extends List<Object>> {
    // 验证方法
    void verifyLogin() throws Exception;
    boolean verifyAccess(SQLConfig<T, M, L> config) throws Exception;
    M verifyRequest(RequestMethod method, String name, M target, M request, 
                  int maxUpdateCount, String database, String schema) throws Exception;
    
    // 角色验证
    void verifyRole(SQLConfig<T, M, L> config) throws Exception;
    
    // 权限检查
    boolean verifyAccess(String table, RequestMethod method, String role) throws Exception;
}
```

#### 2.2.6 FunctionParser 接口

**文件**: [`APIJSONORM/src/main/java/apijson/orm/FunctionParser.java`](APIJSONORM/src/main/java/apijson/orm/FunctionParser.java)

```java
public interface FunctionParser<T, M extends Map<String, Object>, L extends List<Object>> {
    // 函数调用
    Object invoke(String function, M current) throws Exception;
    
    // 函数解析
    static FunctionBean parseFunction(String function, Map<String, Object> request, 
                                     boolean isSQLFunction) throws Exception;
}
```

## 3. 请求方法

### 3.1 RequestMethod 枚举

**文件**: [`APIJSONORM/src/main/java/apijson/RequestMethod.java`](APIJSONORM/src/main/java/apijson/RequestMethod.java)

```java
public enum RequestMethod {
    GET,       // 查询单个对象
    HEAD,      // 查询总数
    GETS,      // 查询多个对象
    HEADS,     // 查询多个总数
    POST,      // 新增数据
    PUT,       // 更新数据
    DELETE,    // 删除数据
    CRUD;      // 混合操作
    
    // 工具方法
    public boolean isGetMethod();
    public boolean isHeadMethod();
    public boolean isQueryMethod();
    public boolean isUpdateMethod();
    public boolean isPublicMethod();
    public boolean isPrivateMethod();
}
```

### 3.2 请求方法详解

#### 3.2.1 GET - 查询单个对象

**请求格式**:
```json
{
  "User": {
    "id": 1
  }
}
```

**生成的 SQL**:
```sql
SELECT * FROM User WHERE id = 1 LIMIT 1
```

**核心实现**:
- [`AbstractParser.parseResponse()`](APIJSONORM/src/main/java/apijson/orm/AbstractParser.java:1)
- [`AbstractObjectParser.parse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:194)
- [`AbstractSQLConfig.getSQL()`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java:1)

#### 3.2.2 GETS - 查询多个对象

**请求格式**:
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

**生成的 SQL**:
```sql
SELECT * FROM User WHERE age > 18 LIMIT 10 OFFSET 0
```

**核心实现**:
- [`AbstractParser.onArrayParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractParser.java:1)
- [`AbstractObjectParser.onChildParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:574)

#### 3.2.3 HEAD - 查询总数

**请求格式**:
```json
{
  "User": {
    "age>": 18
  }
}
```

**生成的 SQL**:
```sql
SELECT COUNT(*) FROM User WHERE age > 18
```

#### 3.2.4 POST - 新增数据

**请求格式**:
```json
{
  "User": {
    "name": "张三",
    "age": 25
  }
}
```

**生成的 SQL**:
```sql
INSERT INTO User (name, age) VALUES ('张三', 25)
```

**核心实现**:
- [`AbstractObjectParser.onTableArrayParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:770)

#### 3.2.5 PUT - 更新数据

**请求格式**:
```json
{
  "User": {
    "id": 1,
    "name": "李四",
    "age": 30
  }
}
```

**生成的 SQL**:
```sql
UPDATE User SET name = '李四', age = 30 WHERE id = 1
```

**核心实现**:
- [`AbstractObjectParser.onPUTArrayParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:656)

#### 3.2.6 DELETE - 删除数据

**请求格式**:
```json
{
  "User": {
    "id": 1
  }
}
```

**生成的 SQL**:
```sql
DELETE FROM User WHERE id = 1
```

#### 3.2.7 CRUD - 混合操作

**请求格式**:
```json
{
  "User": {
    "@method": "POST",
    "name": "张三"
  },
  "Moment": {
    "@method": "PUT",
    "id": 1,
    "content": "更新内容"
  }
}
```

## 4. 条件运算符

### 4.1 比较运算符

| 运算符 | 说明 | 示例 | 生成的 SQL |
|--------|------|------|-----------|
| `=` | 等于 | `"id": 1` | `id = 1` |
| `!=` | 不等于 | `"id!=": 1` | `id != 1` |
| `>` | 大于 | `"age>": 18` | `age > 18` |
| `<` | 小于 | `"age<": 60` | `age < 60` |
| `>=` | 大于等于 | `"age>=": 18` | `age >= 18` |
| `<=` | 小于等于 | `"age<=": 60` | `age <= 60` |
| `<>` | 不等于 | `"id<>": 1` | `id <> 1` |

### 4.2 逻辑运算符

| 运算符 | 说明 | 示例 | 生成的 SQL |
|--------|------|------|-----------|
| `&` | AND | `"id&{}": ">=10,<=20"` | `(id >= 10 AND id <= 20)` |
| `\|` | OR | `"id\|{}": "<=10,>=20"` | `(id <= 10 OR id >= 20)` |
| `!` | NOT | `"id!{}": [1,2,3]` | `id NOT IN (1,2,3)` |

### 4.3 模糊匹配

| 运算符 | 说明 | 示例 | 生成的 SQL |
|--------|------|------|-----------|
| `$` | 模糊匹配 | `"name$": "%张%"` | `name LIKE '%张%'` |
| `~` | 模糊匹配 | `"name~": "张"` | `name LIKE '%张%'` |
| `!~` | 不模糊匹配 | `"name!~": "张"` | `name NOT LIKE '%张%'` |
| `?` | 正则匹配 | `"name?": "^[0-9]+$"` | `name REGEXP '^[0-9]+$'` |

### 4.4 范围运算符

| 运算符 | 说明 | 示例 | 生成的 SQL |
|--------|------|------|-----------|
| `{}` | IN | `"id{}": [1,2,3]` | `id IN (1,2,3)` |
| `!{}` | NOT IN | `"id!{}": [1,2,3]` | `id NOT IN (1,2,3)` |
| `><` | BETWEEN | `"age><": [18,60]` | `age BETWEEN 18 AND 60` |
| `!><` | NOT BETWEEN | `"age!><": [18,60]` | `age NOT BETWEEN 18 AND 60` |

### 4.5 数组运算符

| 运算符 | 说明 | 示例 | 生成的 SQL |
|--------|------|------|-----------|
| `<>` | 包含 | `"userId<>": 1` | `JSON_CONTAINS(userId, 1)` |
| `!<>` | 不包含 | `"userId!<>": 1` | `NOT JSON_CONTAINS(userId, 1)` |

## 5. 特殊字段

### 5.1 查询字段

| 字段 | 说明 | 位置 | 示例 |
|------|------|------|------|
| `@column` | 查询字段 | 对象内 | `"@column": "id,name,age"` |
| `@order` | 排序 | 对象内 | `"@order": "age-,name+"` |
| `@group` | 分组 | 对象内 | `"@group": "name"` |
| `@having` | 分组过滤 | 对象内 | `"@having": "count(*)>1"` |
| `@combine` | 组合查询 | 对象内 | `"@combine": "id,name"` |

### 5.2 数组字段

| 字段 | 说明 | 位置 | 示例 |
|------|------|------|------|
| `count` | 每页数量 | 数组对象 | `"count": 10` |
| `page` | 页码 | 数组对象 | `"page": 0` |
| `query` | 查询类型 | 数组对象 | `"query": 2` |
| `join` | 关联查询 | 数组对象 | `"join": "@/User/id@"` |

### 5.3 全局字段

| 字段 | 说明 | 位置 | 示例 |
|------|------|------|------|
| `tag` | 请求标签 | 最外层 | `"tag": "User"` |
| `version` | 请求版本 | 最外层 | `"version": 1` |
| `format` | 格式化响应 | 最外层 | `"format": true` |
| `role` | 用户角色 | 最外层或对象内 | `"role": "ADMIN"` |
| `database` | 数据库名 | 最外层或对象内 | `"database": "test"` |
| `schema` | 模式名 | 最外层或对象内 | `"schema": "public"` |
| `explain` | 执行计划 | 对象内 | `"explain": true` |
| `cache` | 缓存时间 | 对象内 | `"@cache": "60"` |

## 6. JOIN 查询

### 6.1 Join 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/Join.java`](APIJSONORM/src/main/java/apijson/orm/Join.java)

```java
public class Join<T, M extends Map<String, Object>, L extends List<Object>> {
    // JOIN 类型
    public static final int TYPE_APP = 0;      // APP JOIN
    public static final int TYPE_INNER = 1;   // INNER JOIN
    public static final int TYPE_FULL = 2;    // FULL JOIN
    public static final int TYPE_LEFT = 3;    // LEFT JOIN
    public static final int TYPE_RIGHT = 4;   // RIGHT JOIN
    public static final int TYPE_OUTER = 5;   // OUTER JOIN
    public static final int TYPE_SIDE = 6;    // SIDE JOIN
    public static final int TYPE_ANTI = 7;    // ANTI JOIN
    public static final int TYPE_FOREIGN = 8; // FOREIGN JOIN
    public static final int TYPE_ASOF = 9;    // ASOF JOIN
    
    // JOIN 属性
    private String path;         // 路径
    private String table;        // 关联表
    private String alias;        // 别名
    private String key;          // 关联键
    private String outerKey;     // 外部键
    private int type;           // JOIN 类型
    private M on;              // ON 条件
    private List<M> onList;    // ON 条件列表
}
```

### 6.2 支持的 JOIN 类型

| 类型 | 符号 | 说明 | 对应 SQL |
|------|------|------|----------|
| APP JOIN | `@` | 应用级 JOIN | 多次查询 + 应用层合并 |
| INNER JOIN | `&` | 内连接 | INNER JOIN |
| FULL JOIN | `\|` | 全连接 | FULL JOIN |
| LEFT JOIN | `<` | 左连接 | LEFT JOIN |
| RIGHT JOIN | `>` | 右连接 | RIGHT JOIN |
| OUTER JOIN | `!` | 外连接 | LEFT OUTER JOIN |
| SIDE JOIN | `^` | 侧连接 | LEFT JOIN |
| ANTI JOIN | `(` | 反连接 | LEFT JOIN + NOT |
| FOREIGN JOIN | `)` | 外键连接 | INNER JOIN |
| ASOF JOIN | `~` | 时间点连接 | ASOF JOIN |

### 6.3 JOIN 使用示例

#### 示例 1: INNER JOIN

```json
{
  "Moment": {
    "userId": 82001
  },
  "join": "&/User/id@"
}
```

**生成的 SQL**:
```sql
SELECT Moment.*, User.*
FROM Moment
INNER JOIN User ON User.id = Moment.userId
WHERE Moment.userId = 82001
```

**核心实现**:
- [`AbstractParser.onJoinParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractParser.java:1)
- [`Join`](APIJSONORM/src/main/java/apijson/orm/Join.java:1) 类

#### 示例 2: APP JOIN

```json
{
  "Moment": {
    "userId": 82001
  },
  "join": "@/User/id@"
}
```

**处理流程**:
1. 查询 Moment 表
2. 提取 userId
3. 使用 `WHERE userId IN (...)` 查询 User 表
4. 在应用层合并结果

## 7. 子查询

### 7.1 Subquery 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/Subquery.java`](APIJSONORM/src/main/java/apijson/orm/Subquery.java)

```java
public class Subquery<T, M extends Map<String, Object>, L extends List<Object>> {
    // 子查询属性
    private String path;        // 路径
    private String originKey;   // 原始键
    private M originValue;     // 原始值
    private String from;        // FROM 表
    private String range;       // 范围 (ALL/ANY)
    private String key;         // 替换键
    private SQLConfig<T, M, L> config;  // SQL 配置
    
    // 范围常量
    public static final String RANGE_ALL = "ALL";
    public static final String RANGE_ANY = "ANY";
}
```

### 7.2 子查询类型

| 类型 | 说明 | 示例 |
|------|------|------|
| WHERE 子查询 | WHERE 条件中使用子查询 | `"id{}": {"Moment": {...}}` |
| FROM 子查询 | FROM 中使用子查询 | `"id>": {"Moment": {...}}` |
| SELECT 子查询 | SELECT 中使用子查询 | `"@column": "id,(SELECT ...) AS count"` |
| ALL 范围 | ALL 范围 | `"id{}": {"range": "ALL", ...}` |
| ANY 范围 | ANY 范围 | `"id{}": {"range": "ANY", ...}` |

### 7.3 子查询使用示例

#### 示例 1: WHERE 子查询

```json
{
  "User": {
    "id{}": {
      "Moment": {
        "userId@": "/User/id"
      }
    }
  }
}
```

**生成的 SQL**:
```sql
SELECT * FROM User
WHERE id IN (SELECT DISTINCT userId FROM Moment)
```

**核心实现**:
- [`AbstractObjectParser.onParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:394)
- [`Subquery`](APIJSONORM/src/main/java/apijson/orm/Subquery.java:1) 类

#### 示例 2: 比较子查询

```json
{
  "User": {
    "id>": {
      "Moment": {
        "@column": "AVG(userId):avgId"
      }
    }
  }
}
```

**生成的 SQL**:
```sql
SELECT * FROM User
WHERE id > (SELECT AVG(userId) FROM Moment)
```

## 8. 函数调用

### 8.1 函数类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 远程函数 | 调用后端定义的函数 | `"name": "functionName(arg1, arg2)"` |
| 存储过程 | 调用数据库存储过程 | `"@procedure": "procedureName(arg1, arg2)"` |
| 脚本函数 | 执行脚本函数 | `"name": "script:javascript:code"` |

### 8.2 函数调用时机

| 类型 | 执行时机 | 说明 |
|------|----------|------|
| `key-():function` | executeSQL 前 | 在 SQL 执行前解析 |
| `key():function` | executeSQL 后、onChildParse 前 | 在 SQL 执行后解析 |
| `key+():function` | onChildParse 后 | 在子对象解析后解析 |

### 8.3 函数调用示例

#### 示例 1: 远程函数

```json
{
  "User": {
    "name": "customFunction('hello', 'world')"
  }
}
```

**核心实现**:
- [`AbstractFunctionParser`](APIJSONORM/src/main/java/apijson/orm/AbstractFunctionParser.java:1)
- [`AbstractObjectParser.parseFunction()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:1075)

#### 示例 2: 存储过程

```json
{
  "User": {
    "@procedure": "getUserById(1)"
  }
}
```

## 9. 引用赋值

### 9.1 引用语法

| 语法 | 说明 | 示例 |
|------|------|------|
| `key@` | 引用单个值 | `"userId@": "/Moment/userId"` |
| `key{}@` | 引用数组值 | `"userId{}@": "[]/Moment/userId"` |

### 9.2 引用路径格式

| 格式 | 说明 | 示例 |
|------|------|------|
| `/table/field` | 从根节点开始的完整路径 | `"/Moment/userId"` |
| `[]/table/field` | 引用数组中的字段 | `"[]/Moment/id"` |

### 9.3 引用赋值示例

#### 示例 1: 单值引用

```json
{
  "Moment": {
    "id": 12
  },
  "User": {
    "id@": "/Moment/userId"
  }
}
```

**处理流程**:
1. 查询 Moment，获取 userId
2. 将 userId 的值赋给 User.id
3. 查询 User，WHERE id = userId

**核心实现**:
- [`AbstractObjectParser.onParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:394)
- [`AbstractObjectParser.onReferenceParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:1141)

#### 示例 2: 数组引用

```json
{
  "Moment[]": {
    "count": 5,
    "Moment": {}
  },
  "User": {
    "id{}@": "[]/Moment/userId"
  }
}
```

**处理流程**:
1. 查询 Moment[]，获取 5 条记录
2. 提取所有 userId
3. 查询 User，WHERE id IN (userId1, userId2, ...)

## 10. 数组查询

### 10.1 数组查询语法

| 语法 | 说明 | 示例 |
|------|------|------|
| `Table[]` | 数组查询 | `"User[]": {...}` |
| `[]` | 数组容器 | `"[]": {...}` |

### 10.2 数组查询示例

#### 示例 1: 基本数组查询

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

**核心实现**:
- [`AbstractParser.onArrayParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractParser.java:1)
- [`AbstractObjectParser.onChildParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:574)

#### 示例 2: 数组容器

```json
{
  "[]": {
    "count": 2,
    "Moment": {
      "content$": "%APIJSON%"
    },
    "User": {
      "id@": "/Moment/userId"
    }
  }
}
```

## 11. 聚合函数

### 11.1 支持的聚合函数

| 函数 | 说明 | 示例 |
|------|------|------|
| COUNT | 计数 | `"@column": "COUNT(*):count"` |
| SUM | 求和 | `"@column": "SUM(age):totalAge"` |
| AVG | 平均值 | `"@column": "AVG(age):avgAge"` |
| MIN | 最小值 | `"@column": "MIN(age):minAge"` |
| MAX | 最大值 | `"@column": "MAX(age):maxAge"` |

### 11.2 聚合函数示例

#### 示例 1: 基本聚合

```json
{
  "User": {
    "@column": "COUNT(*):count"
  }
}
```

**生成的 SQL**:
```sql
SELECT COUNT(*) AS count FROM User
```

#### 示例 2: GROUP BY 聚合

```json
{
  "User": {
    "@column": "name,COUNT(*):count",
    "@group": "name"
  }
}
```

**生成的 SQL**:
```sql
SELECT name, COUNT(*) AS count
FROM User
GROUP BY name
```

**核心实现**:
- [`AbstractSQLConfig.getGroupString()`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java:1)

## 12. 数据库支持

### 12.1 支持的数据库类型

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java:1)

| 数据库 | 常量 | 说明 |
|--------|--------|------|
| MySQL | `"MySQL"` | 支持 LIMIT/OFFSET |
| PostgreSQL | `"PostgreSQL"` | 支持 LIMIT/OFFSET |
| Oracle | `"Oracle"` | 使用 ROWNUM 分页 |
| SQL Server | `"SQLServer"` | 使用 TOP 分页 |
| MongoDB | `"MongoDB"` | 使用 MongoDB 查询语法 |
| ClickHouse | `"ClickHouse"` | 支持 LIMIT/OFFSET |
| TiDB | `"TiDB"` | 兼容 MySQL |
| DB2 | `"DB2"` | 使用 FETCH FIRST |
| Sybase | `"Sybase"` | 使用 TOP |
| 达梦 | `"DM"` | 支持 LIMIT |
| 人大金仓 | `"Kingbase"` | 支持 LIMIT |
| 神通 | `"Oscar"` | 支持 LIMIT |

### 12.2 数据库适配实现

```java
// 数据库类型检测
public static String getDatabase(String database) {
    if (database == null || database.isEmpty()) {
        return DEFAULT_DATABASE;
    }
    // 返回数据库类型
    return database;
}

// 引用符获取
public String getQuote() {
    switch (getDatabase()) {
        case "MySQL":
            return "`";
        case "PostgreSQL":
        case "Oracle":
        case "SQLServer":
            return "\"";
        default:
            return "";
    }
}

// 分页语句生成
public String getLimitString(int count, int page) {
    switch (getDatabase()) {
        case "MySQL":
        case "PostgreSQL":
        case "ClickHouse":
            return " LIMIT " + count + " OFFSET " + page;
        case "Oracle":
            return " AND ROWNUM <= " + (page + count);
        case "SQLServer":
            return " OFFSET " + page + " ROWS FETCH NEXT " + count + " ROWS ONLY";
        default:
            return "";
    }
}
```

## 13. 高级特性

### 13.1 缓存机制

**核心实现**:
- [`AbstractSQLExecutor`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLExecutor.java:1)

```java
// 缓存配置
public static boolean ENABLE_CACHE = true;
public static int CACHE_EXPIRE_TIME = 60;
public static int MAX_CACHE_SIZE = 1000;

// 缓存方法
public M getCache(String key);
public void putCache(String key, M value);
public void removeCache(String key);
public void clearCache();
```

### 13.2 事务管理

```java
// 事务方法
public void begin(int transactionIsolation) throws Exception;
public void commit() throws Exception;
public void rollback() throws Exception;
public void rollback(Savepoint savepoint) throws Exception;
public Savepoint setSavepoint(String name) throws Exception;

// 事务隔离级别
Connection.TRANSACTION_NONE
Connection.TRANSACTION_READ_UNCOMMITTED
Connection.TRANSACTION_READ_COMMITTED
Connection.TRANSACTION_REPEATABLE_READ
Connection.TRANSACTION_SERIALIZABLE
```

### 13.3 批量操作

**核心实现**:
- [`AbstractObjectParser.onTableArrayParse()`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java:770)

```java
// 批量新增/修改
void onTableArrayParse(String key, L valueArray) throws Exception;

// PUT 数组操作
void onPUTArrayParse(String key, L array) throws Exception;
```

### 13.4 权限控制

**核心实现**:
- [`AbstractVerifier`](APIJSONORM/src/main/java/apijson/orm/AbstractVerifier.java:1)

```java
// 角色类型
public static final String UNKNOWN = "UNKNOWN";
public static final String LOGIN = "LOGIN";
public static final String CONTACT = "CONTACT";
public static final String CIRCLE = "CIRCLE";
public static final String OWNER = "OWNER";
public static final String ADMIN = "ADMIN";

// 验证方法
void verifyLogin() throws Exception;
boolean verifyAccess(SQLConfig config) throws Exception;
M verifyRequest(RequestMethod method, String name, M target, M request, 
              int maxUpdateCount, String database, String schema) throws Exception;
```

## 14. 核心抽象类

### 14.1 AbstractParser

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractParser.java`](APIJSONORM/src/main/java/apijson/orm/AbstractParser.java)

**主要职责**:
1. 请求解析
2. 请求验证
3. 权限控制
4. SQL 生成协调
5. SQL 执行协调
6. 结果封装

**核心方法**:
```java
// 主解析方法
public M parseResponse(M request) throws Exception;

// 对象和数组解析
public ObjectParser<T, M, L> onObjectParse(M request, String parentPath, String name,
                                           SQLConfig<T, M, L> arrayConfig,
                                           boolean isSubquery, M cache) throws Exception;
public L onArrayParse(M request, String parentPath, String name,
                      boolean isSubquery, L cache) throws Exception;

// JOIN 解析
public List<Join<T, M, L>> onJoinParse(Object join, M request) throws Exception;

// 路径值获取
public Object getValueByPath(String path);
public void putQueryResult(String path, Object result);
```

### 14.2 AbstractObjectParser

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java`](APIJSONORM/src/main/java/apijson/orm/AbstractObjectParser.java)

**主要职责**:
1. 对象解析
2. 字段提取
3. 条件解析
4. 引用解析
5. 函数解析

**核心方法**:
```java
// 解析方法
public AbstractObjectParser<T, M, L> parse(String name, boolean isReuse) throws Exception;

// 成员解析
public boolean onParse(@NotNull String key, @NotNull Object value) throws Exception;
public Object onChildParse(int index, String key, M value, Object cache) throws Exception;
public Object onReferenceParse(@NotNull String path);

// 数组解析
public void onPUTArrayParse(@NotNull String key, @NotNull L array) throws Exception;
public void onTableArrayParse(@NotNull String key, @NotNull L array) throws Exception;

// SQL 配置和执行
public AbstractObjectParser<T, M, L> setSQLConfig() throws Exception;
public AbstractObjectParser<T, M, L> executeSQL() throws Exception;
public M onSQLExecute() throws Exception;
```

### 14.3 AbstractSQLConfig

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLConfig.java)

**主要职责**:
1. SQL 语句生成
2. 数据库适配
3. WHERE 条件生成
4. JOIN 语句生成
5. 参数绑定

**核心方法**:
```java
// SQL 生成
public String getSQL(boolean prepared) throws Exception;
public String getSQL(boolean prepared, boolean withSQL) throws Exception;

// 子句生成
public String getWhereString(boolean prepared) throws Exception;
public String getJoinString(boolean prepared) throws Exception;
public String getGroupString() throws Exception;
public String getHavingString(boolean prepared) throws Exception;
public String getOrderString() throws Exception;
```

### 14.4 AbstractSQLExecutor

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractSQLExecutor.java`](APIJSONORM/src/main/java/apijson/orm/AbstractSQLExecutor.java)

**主要职责**:
1. SQL 执行
2. 结果处理
3. 类型转换
4. 缓存管理
5. 事务管理

**核心方法**:
```java
// SQL 执行
public M execute(SQLConfig<T, M, L> config, boolean isSubquery) throws Exception;
public List<Map<String, Object>> executeQuery(String sql, List<Object> values) throws Exception;
public int executeUpdate(String sql, List<Object> values) throws Exception;

// 缓存管理
public M getCache(String key);
public void putCache(String key, M value);

// 事务管理
public void begin(int transactionIsolation) throws Exception;
public void commit() throws Exception;
public void rollback() throws Exception;
```

### 14.5 AbstractVerifier

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractVerifier.java`](APIJSONORM/src/main/java/apijson/orm/AbstractVerifier.java)

**主要职责**:
1. 登录验证
2. 角色验证
3. 操作权限验证
4. 内容结构验证

**核心方法**:
```java
// 验证方法
public void verifyLogin() throws Exception;
public boolean verifyAccess(SQLConfig<T, M, L> config) throws Exception;
public M verifyRequest(RequestMethod method, String name, M target, M request,
                  int maxUpdateCount, String database, String schema) throws Exception;

// 角色验证
public void verifyRole(SQLConfig<T, M, L> config) throws Exception;
```

### 14.6 AbstractFunctionParser

**文件**: [`APIJSONORM/src/main/java/apijson/orm/AbstractFunctionParser.java`](APIJSONORM/src/main/java/apijson/orm/AbstractFunctionParser.java)

**主要职责**:
1. 函数解析
2. 参数提取
3. 函数调用
4. 脚本执行

**核心方法**:
```java
// 函数调用
public Object invoke(String function, M current) throws Exception;

// 函数解析
public static FunctionBean parseFunction(String function, Map<String, Object> request,
                                     boolean isSQLFunction) throws Exception;
```

## 15. 模型类

### 15.1 Table 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/model/Table.java`](APIJSONORM/src/main/java/apijson/orm/model/Table.java)

```java
public class Table {
    private String name;      // 表名
    private String schema;    // 模式名
    private String database;  // 数据库名
    
    // getter/setter
}
```

### 15.2 Column 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/model/Column.java`](APIJSONORM/src/main/java/apijson/orm/model/Column.java)

```java
public class Column {
    private String name;      // 列名
    private String type;      // 数据类型
    private int length;      // 长度
    private boolean isNull;  // 是否可空
    
    // getter/setter
}
```

### 15.3 Request 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/model/Request.java`](APIJSONORM/src/main/java/apijson/orm/model/Request.java)

```java
public class Request {
    private String name;      // 请求名称
    private String method;    // 请求方法
    private String tag;      // 标签
    private String structure; // 结构
    
    // getter/setter
}
```

### 15.4 Document 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/model/Document.java`](APIJSONORM/src/main/java/apijson/orm/model/Document.java)

```java
public class Document {
    private Long id;             // ID
    private Long userId;         // 用户 ID
    private Integer version;      // 版本
    private String name;         // 名称
    private String url;          // URL
    private String request;       // 请求
    private String response;      // 响应
    
    // getter/setter
}
```

## 16. JSON 工具类

### 16.1 JSON 类

**文件**: [`APIJSONORM/src/main/java/apijson/JSON.java`](APIJSONORM/src/main/java/apijson/JSON.java)

**主要方法**:
```java
// JSON 序列化和反序列化
public static String toJSONString(Object obj);
public static <M extends Map<String, Object>> M parseObject(Object json);
public static <L extends List<Object>> L parseArray(Object json);

// 类型转换
public static Boolean getBooleanValue(Map<String, Object> map, String key);
public static Integer getIntValue(Map<String, Object> map, String key);
public static Long getLongValue(Map<String, Object> map, String key);
public static String getString(Map<String, Object> map, String key);

// JSON 对象创建
public static M createJSONObject();
public static L createJSONArray();
```

### 16.2 JSONRequest 类

**文件**: [`APIJSONORM/src/main/java/apijson/orm/JSONRequest.java`](APIJSONORM/src/main/java/apijson/orm/JSONRequest.java)

**常量定义**:
```java
// 请求键
public static final String KEY_TAG = "tag";
public static final String KEY_VERSION = "version";
public static final String KEY_FORMAT = "format";
public static final String KEY_ROLE = "role";

// 查询键
public static final String KEY_QUERY = "query";
public static final String KEY_COUNT = "count";
public static final String KEY_PAGE = "page";
public static final String KEY_JOIN = "join";

// 数组键
public static final String KEY_ARRAY = "[]";
```

### 16.3 JSONResponse 类

**文件**: [`APIJSONORM/src/main/java/apijson/JSONResponse.java`](APIJSONORM/src/main/java/apijson/JSONResponse.java)

**主要方法**:
```java
// 响应状态
default int getCode();
default String getMsg();
default boolean isSuccess();

// 数据获取
default <T> T getObject(Class<T> clazz);
default <T> List<T> getList(String key);

// 格式化数组键
static String formatArrayKey(String key);
```

## 17. 异常处理

### 17.1 异常类

| 异常类 | 说明 |
|--------|------|
| [`CommonException`](APIJSONORM/src/main/java/apijson/orm/exception/CommonException.java:1) | 通用异常 |
| [`ConditionErrorException`](APIJSONORM/src/main/java/apijson/orm/exception/ConditionErrorException.java:1) | 条件错误异常 |
| [`ConflictException`](APIJSONORM/src/main/java/apijson/orm/exception/ConflictException.java:1) | 冲突异常 |
| [`NotExistException`](APIJSONORM/src/main/java/apijson/orm/exception/NotExistException.java:1) | 不存在异常 |
| [`NotLoggedInException`](APIJSONORM/src/main/java/apijson/orm/exception/NotLoggedInException.java:1) | 未登录异常 |
| [`OutOfRangeException`](APIJSONORM/src/main/java/apijson/orm/exception/OutOfRangeException.java:1) | 超出范围异常 |
| [`UnsupportedDataTypeException`](APIJSONORM/src/main/java/apijson/orm/exception/UnsupportedDataTypeException.java:1) | 不支持的数据类型异常 |

## 18. 配置选项

### 18.1 Parser 配置

```java
// 分页配置
public static boolean IS_START_FROM_1 = false;
public static int MAX_QUERY_PAGE = 100;
public static int DEFAULT_QUERY_COUNT = 10;
public static int MAX_QUERY_COUNT = 100;

// 查询限制配置
public static int MAX_SQL_COUNT = 200;
public static int MAX_OBJECT_COUNT = 5;
public static int MAX_ARRAY_COUNT = 5;
public static int MAX_QUERY_DEPTH = 5;

// 日志配置
public static boolean IS_PRINT_REQUEST_STRING_LOG = false;
public static boolean IS_PRINT_BIG_LOG = false;
public static boolean IS_PRINT_REQUEST_ENDTIME_LOG = false;
public static boolean IS_RETURN_STACK_TRACE = true;
```

### 18.2 SQLConfig 配置

```java
// 数据库配置
public static String DEFAULT_DATABASE = "sys";
public static String DEFAULT_SCHEMA = "public";
public static String DEFAULT_DATASOURCE = "DEFAULT";

// 缓存配置
public static boolean ENABLE_CACHE = true;
public static int CACHE_EXPIRE_TIME = 60;
public static int MAX_CACHE_SIZE = 1000;
```

### 18.3 Verifier 配置

```java
// 验证配置
public static boolean ENABLE_VERIFY_ROLE = true;
public static boolean ENABLE_VERIFY_CONTENT = true;
```

### 18.4 FunctionParser 配置

```java
// 函数配置
public static boolean ENABLE_REMOTE_FUNCTION = true;
public static boolean ENABLE_SCRIPT_FUNCTION = true;
```

## 19. 总结

APIJSONORM 是一个功能强大的 JSON ORM 框架,提供了以下核心功能:

### 19.1 核心功能

1. **请求解析**: 解析 JSON 格式的请求
2. **SQL 生成**: 根据请求自动生成 SQL 语句
3. **SQL 执行**: 执行 SQL 并处理结果
4. **权限验证**: 验证用户权限和请求内容
5. **JSON 处理**: JSON 序列化和反序列化

### 19.2 请求方法

- GET: 查询单个对象
- HEAD: 查询总数
- GETS: 查询多个对象
- HEADS: 查询多个总数
- POST: 新增数据
- PUT: 更新数据
- DELETE: 删除数据
- CRUD: 混合操作

### 19.3 高级特性

- JOIN 查询: 支持 10 种 JOIN 类型
- 子查询: 支持 WHERE、FROM、SELECT 子查询
- 聚合函数: COUNT、SUM、AVG、MIN、MAX
- 远程函数: 支持自定义函数调用
- 脚本执行: 支持 JavaScript、Lua 等脚本
- 事务管理: 支持自动和手动事务
- 缓存机制: 支持 SQL 结果缓存
- 批量操作: 支持批量插入、更新、删除
- 引用赋值: 支持字段值引用

### 19.4 数据库支持

支持 30+ 种数据库,包括:
- MySQL、PostgreSQL、Oracle、SQL Server
- MongoDB、ClickHouse、TiDB
- DB2、Sybase、达梦、人大金仓、神通

### 19.5 架构特点

- 分层架构: Parser → Verifier → SQLConfig → SQLExecutor
- 接口设计: 所有核心组件都提供接口
- 抽象类: 提供默认实现,便于扩展
- 多数据库支持: 统一接口,自动适配不同数据库

通过合理使用这些功能和 API,可以实现复杂的数据库操作,而无需编写 SQL 语句。
