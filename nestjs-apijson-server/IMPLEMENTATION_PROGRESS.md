# APIJSON ORM 实现进度

## 核心架构实现状态

### 已完成 ✅

#### 1. 基础类型和接口
- [x] RequestMethod 枚举 - 请求方法枚举（GET, HEAD, GETS, HEADS, POST, PUT, DELETE, CRUD）
- [x] Parser 接口 - 解析器接口
- [x] ObjectParser 接口 - 对象解析器接口
- [x] SQLConfig 接口 - SQL配置接口
- [x] SQLExecutor 接口 - SQL执行器接口
- [x] Verifier 接口 - 验证器接口
- [x] FunctionParser 接口 - 函数解析器接口
 
#### 2. 模型类
- [x] Join 模型 - JOIN连接模型（支持10种JOIN类型）
- [x] Subquery 模型 - 子查询模型（支持ALL/ANY范围）

#### 3. 异常处理
- [x] CommonException - 基础异常类
- [x] ConditionErrorException - 条件错误异常
- [x] ConflictException - 冲突异常
- [x] NotExistException - 不存在异常
- [x] NotLoggedInException - 未登录异常
- [x] OutOfRangeException - 超出范围异常
- [x] UnsupportedDataTypeException - 不支持的数据类型异常

#### 4. 运算符解析器
- [x] OperatorParser - 条件运算符解析器
  - 比较运算符（=, !=, >, <, >=, <=, <>）
  - 逻辑运算符（&, |, !）
  - 模糊运算符（$, ~, !~, ?）
  - 范围运算符（{}, !{}, ><, !><）
  - 数组运算符（<>）

#### 5. 配置管理
- [x] APIJSONConfig - APIJSON配置类
  - Parser配置（分页、查询限制、日志）
  - SQLConfig配置（数据库、缓存）
  - Verifier配置（权限验证）
  - FunctionParser配置（函数调用）
  - 数据库配置（12种数据库类型）
  - 环境变量加载支持

#### 6. 抽象基类
- [x] AbstractParser - 解析器抽象类
  - 请求解析和验证
  - 对象和数组解析
  - JOIN解析
  - 路径值管理
  - 角色验证
  - 组件创建方法
  - 请求参数getter/setter

- [x] AbstractObjectParser - 对象解析器抽象类
  - 对象解析方法（parse, parseResponse）
  - 成员解析（onParse, onChildParse）
  - 引用解析（onReferenceParse）
  - PUT和表数组解析（onPUTArrayParse, onTableArrayParse）
  - SQL配置和执行（setSQLConfig, executeSQL）
  - 函数和子响应处理
  - 内存管理（recycle, onComplete）

- [x] AbstractSQLConfig - SQL配置抽象类
  - SQL语句生成（getSQL, getWhereString, getJoinString, getGroupString, getHavingString, getOrderString, getLimitString）
  - JOIN语句生成（支持10种JOIN类型）
  - 数据库适配（12种数据库类型的LIMIT语法）
  - 条件构建方法
  - 所有配置getter/setter方法

- [x] AbstractSQLExecutor - SQL执行器抽象类
  - SQL执行（execute, executeQuery, executeUpdate）
  - 缓存管理（getCache, putCache, removeCache, clearCache，支持过期时间）
  - 事务管理（begin, commit, rollback, setSavepoint）
  - 连接管理（getConnection, closeConnection）
  - 所有配置getter/setter方法

- [x] AbstractVerifier - 验证器抽象类
  - 登录验证（verifyLogin）
  - 访问权限验证（verifyAccess, verifyAccess）
  - 请求验证（verifyRequest）
  - 角色验证（verifyRole）
  - 内容验证（verifyContent）
  - 用户管理（userId, role）
  - 配置管理方法

- [x] AbstractFunctionParser - 函数解析器抽象类
  - 函数调用（invoke）
  - 函数解析（parseFunction）
  - 函数执行（executeFunction）
  - 脚本函数执行（executeScriptFunction）
  - SQL函数执行（executeSQLFunction）
  - 远程函数执行（executeRemoteFunction）
  - 函数注册管理（registerFunction, unregisterFunction）
  - 脚本执行器管理（registerScriptExecutor, unregisterScriptExecutor）

### 进行中 🚧

#### 特殊字段解析
- [ ] @column - 列选择解析器
- [ ] @order - 排序解析器
- [ ] @group - 分组解析器
- [ ] @having - 分组过滤解析器
- [ ] @combine - 组合解析器
- [ ] count - 计数解析器
- [ ] page - 分页解析器
- [ ] query - 查询解析器
- [ ] join - JOIN解析器
- [ ] @cache - 缓存解析器
- [ ] @explain - 解释计划解析器

### 待实现 📋

#### JOIN查询支持
- [ ] 10种JOIN类型的SQL生成
  - [ ] APP JOIN (@)
  - [ ] INNER JOIN (&)
  - [ ] FULL JOIN (|)
  - [ ] LEFT JOIN (<)
  - [ ] RIGHT JOIN (>)
  - [ ] OUTER JOIN (!)
  - [ ] SIDE JOIN (^)
  - [ ] ANTI JOIN (()
  - [ ] FOREIGN JOIN ())
  - [ ] ASOF JOIN (~)

#### 子查询功能
- [ ] WHERE子查询
- [ ] FROM子查询
- [ ] SELECT子查询
- [ ] ALL/ANY范围支持

#### 函数调用功能
- [ ] 远程函数调用
- [ ] 存储过程调用
- [ ] 脚本函数调用（JavaScript, Lua等）

#### 引用赋值功能
- [ ] key@ 引用赋值
- [ ] key{}@ 引用赋值（数组）

#### 数组查询功能
- [ ] Table[] 表数组查询
- [ ] [] 空数组查询

#### 聚合函数支持
- [ ] COUNT
- [ ] SUM
- [ ] AVG
- [ ] MIN
- [ ] MAX

#### 缓存机制
- [ ] 内存缓存实现
- [ ] Redis缓存实现
- [ ] 缓存过期策略
- [ ] 缓存刷新机制

#### 事务管理
- [ ] 事务开始
- [ ] 事务提交
- [ ] 事务回滚
- [ ] 保存点设置

#### 批量操作
- [ ] 批量插入
- [ ] 批量更新
- [ ] 批量删除

#### 权限控制
- [ ] 角色验证
- [ ] 访问控制
- [ ] 内容验证
- [ ] 权限配置

#### 数据库适配
- [ ] MySQL适配器
- [ ] PostgreSQL适配器
- [ ] SQLite适配器
- [ ] Oracle适配器
- [ ] SQL Server适配器
- [ ] MongoDB适配器
- [ ] ClickHouse适配器
- [ ] TiDB适配器
- [ ] DB2适配器
- [ ] Sybase适配器
- [ ] DM适配器
- [ ] Kingbase适配器
- [ ] Oscar适配器

#### 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试

## 实现说明

### 核心设计原则
1. **类型安全** - 使用TypeScript泛型确保类型安全
2. **可扩展性** - 抽象基类提供默认实现，子类可按需重写
3. **模块化** - 各组件职责单一，低耦合高内聚
4. **性能优化** - 支持缓存、批量操作、连接池等
5. **错误处理** - 完善的异常体系，详细的错误信息

### 架构层次
```
Parser (解析器)
  ↓
Verifier (验证器)
  ↓
ObjectParser (对象解析器)
  ↓
SQLConfig (SQL配置)
  ↓
SQLExecutor (SQL执行器)
  ↓
Database (数据库)
```

### 下一步计划
1. 实现特殊字段解析器（@column, @order, @group, @having等）
2. 实现JOIN查询支持（10种JOIN类型）
3. 实现子查询功能
4. 实现函数调用功能
5. 实现引用赋值功能
6. 实现数组查询功能
7. 实现聚合函数支持
8. 实现缓存机制
9. 实现事务管理
10. 实现批量操作
11. 实现权限控制
12. 实现数据库适配
13. 编写测试
