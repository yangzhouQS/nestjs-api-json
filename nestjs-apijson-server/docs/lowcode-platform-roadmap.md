# APIJSON 低代码平台开发规划

## 1. 当前项目分析

### 1.1 已实现功能
- ✅ APIJSON请求解析（ParserService）
- ✅ 请求验证（VerifierService）
- ✅ SQL查询构建（BuilderService）
- ✅ 查询执行（ExecutorService）
- ✅ 缓存服务（CacheService）
- ✅ 认证守卫（APIJSONAuthGuard）
- ✅ 限流守卫（APIJSONRateLimitGuard）
- ✅ 异常过滤器（APIJSONExceptionFilter）
- ✅ 输入验证管道（APIJSONValidationPipe）

### 1.2 功能缺口分析
作为低代码平台后台，当前项目缺少以下核心功能：
1. **可视化查询构建器** - 无GUI界面
2. **数据源管理** - 无多数据源支持
3. **用户权限系统** - 权限控制过于简单
4. **API管理** - 无API版本管理、文档生成
5. **数据模型管理** - 无表结构可视化
6. **工作流编排** - 无复杂业务流程支持
7. **插件系统** - 无扩展机制
8. **监控告警** - 无完整的监控体系
9. **日志审计** - 无操作审计追踪
10. **部署管理** - 无一键部署功能

## 2. 低代码平台功能规划

### 2.1 核心功能模块

#### 2.1.1 可视化查询构建器 (Visual Query Builder)
**优先级**: P0 (最高)
**预计工期**: 4-6周

**功能描述**:
提供拖拽式可视化查询构建界面，用户无需编写APIJSON语法即可构建复杂查询。

**核心功能**:
- 表选择器（带搜索和筛选）
- 字段选择器（支持多选、全选）
- 条件构建器（支持AND/OR逻辑）
- 连接构建器（支持INNER/LEFT/RIGHT JOIN）
- 分组构建器（GROUP BY）
- 排序构建器（ORDER BY）
- 分页配置（LIMIT/OFFSET）
- 实时预览（显示生成的APIJSON）
- 查询模板保存和加载
- 历史查询记录

**技术实现**:
```typescript
// 前端组件结构
interface QueryBuilderState {
  tables: SelectedTable[];
  joins: JoinConfig[];
  conditions: ConditionNode[];
  groupBy: string[];
  orderBy: OrderConfig[];
  pagination: PaginationConfig;
}

// 后端API
POST /api/query-builder/validate
POST /api/query-builder/save-template
GET  /api/query-builder/templates
GET  /api/query-builder/history
```

#### 2.1.2 数据源管理 (Data Source Management)
**优先级**: P0
**预计工期**: 3-4周

**功能描述**:
支持多种数据源类型，实现统一的数据访问层。

**核心功能**:
- 数据源CRUD操作
- 数据源类型支持：
  - MySQL/MariaDB
  - PostgreSQL
  - SQLite
  - MongoDB
  - Redis（缓存）
  - Elasticsearch（搜索）
  - HTTP API（外部数据源）
- 连接测试
- 连接池管理
- 数据源健康检查
- 数据源权限控制
- 数据源使用统计

**技术实现**:
```typescript
// 数据源配置接口
interface DataSourceConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'http';
  connection: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    [key: string]: any;
  };
  options: {
    poolSize: number;
    timeout: number;
    ssl: boolean;
  };
  metadata: {
    tables: TableMetadata[];
    version: string;
    status: 'connected' | 'disconnected' | 'error';
  };
}

// 后端API
POST /api/datasources
PUT  /api/datasources/:id
DELETE /api/datasources/:id
GET  /api/datasources
POST /api/datasources/:id/test
GET  /api/datasources/:id/health
GET  /api/datasources/:id/tables
```

#### 2.1.3 用户权限系统 (User & Permission System)
**优先级**: P0
**预计工期**: 4-5周

**功能描述**:
实现完善的RBAC（基于角色的访问控制）系统。

**核心功能**:
- 用户管理
  - 用户CRUD
  - 用户启用/禁用
  - 密码重置
  - 用户导入/导出
- 角色管理
  - 角色CRUD
  - 角色继承
  - 预置角色（管理员、开发者、查看者等）
- 权限管理
  - 权限CRUD
  - 权限分组（数据源、查询、API等）
  - 权限继承
- 数据权限
  - 表级权限
  - 字段级权限
  - 行级权限（Row-Level Security）
- 审计日志
  - 用户操作记录
  - 权限变更记录
  - 登录日志

**技术实现**:
```typescript
// 权限模型
interface Permission {
  id: string;
  name: string;
  code: string;
  resource: string; // 数据源、查询、API等
  action: 'read' | 'write' | 'delete' | 'execute';
  scope: 'global' | 'datasource' | 'table' | 'column' | 'row';
  conditions?: any; // 行级权限条件
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: string[]; // 角色继承
  isSystem: boolean; // 系统预置角色
}

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  dataPermissions: DataPermission[];
  status: 'active' | 'disabled' | 'locked';
  lastLoginAt: Date;
  createdAt: Date;
}

// 后端API
// 用户管理
POST /api/users
PUT  /api/users/:id
DELETE /api/users/:id
GET  /api/users
POST /api/users/:id/reset-password

// 角色管理
POST /api/roles
PUT  /api/roles/:id
DELETE /api/roles/:id
GET  /api/roles

// 权限管理
POST /api/permissions
GET  /api/permissions
POST /api/roles/:id/permissions

// 审计日志
GET /api/audit-logs
GET /api/audit-logs/:userId
```

#### 2.1.4 API管理 (API Management)
**优先级**: P1
**预计工期**: 3-4周

**功能描述**:
提供API的版本管理、文档生成和测试功能。

**核心功能**:
- API版本管理
  - 多版本支持
  - 版本发布/下线
  - 版本对比
- API文档生成
  - 自动生成OpenAPI/Swagger文档
  - 请求/响应示例
  - 错误码说明
- API测试
  - 在线测试界面
  - 测试用例管理
  - 测试报告生成
- API网关
  - 请求路由
  - 限流配置
  - 缓存配置
  - 认证配置
- API监控
  - 调用次数统计
  - 响应时间监控
  - 错误率监控

**技术实现**:
```typescript
// API配置
interface ApiConfig {
  id: string;
  name: string;
  version: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  tags: string[];
  auth: boolean;
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  status: 'draft' | 'published' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

// 后端API
POST /api/apis
PUT /api/apis/:id
DELETE /api/apis/:id
GET  /api/apis
POST /api/apis/:id/publish
POST /api/apis/:id/test
GET /api/apis/:id/docs
GET /api/openapi.json
```

#### 2.1.5 数据模型管理 (Data Model Management)
**优先级**: P1
**预计工期**: 3-4周

**功能描述**:
可视化管理和设计数据模型结构。

**核心功能**:
- 表结构可视化
  - ER图展示
  - 表关系可视化
  - 字段详情查看
- 表设计器
  - 创建/修改表
  - 字段类型选择
  - 索引管理
  - 约束管理
- 关系管理
  - 一对一关系
  - 一对多关系
  - 多对多关系
- 模型版本控制
  - 模型版本历史
  - 版本对比
  - 版本回滚
- 模型导入/导出
  - 支持SQL导出
  - 支持JSON格式
  - 支持DDL生成

**技术实现**:
```typescript
// 数据模型定义
interface TableModel {
  id: string;
  name: string;
  comment: string;
  columns: ColumnModel[];
  indexes: IndexModel[];
  relationships: RelationshipModel[];
  version: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

interface ColumnModel {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  length?: number;
  nullable: boolean;
  defaultValue?: any;
  comment: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isIndexed: boolean;
}

interface RelationshipModel {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: 'cascade' | 'restrict' | 'set-null';
  onUpdate: 'cascade' | 'restrict';
}

// 后端API
POST /api/models
PUT /api/models/:id
DELETE /api/models/:id
GET /api/models
POST /api/models/:id/publish
GET /api/models/:id/ddl
GET /api/models/diagram
```

#### 2.1.6 工作流编排 (Workflow Orchestration)
**优先级**: P1
**预计工期**: 4-6周

**功能描述**:
支持复杂的业务流程编排和自动化。

**核心功能**:
- 可视化流程设计器
  - 拖拽式节点设计
  - 节点类型：查询、转换、条件、循环等
  - 连线配置
- 流程节点
  - 数据查询节点
  - 数据转换节点
  - 条件分支节点
  - 循环迭代节点
  - 外部API调用节点
  - 通知节点
- 流程执行引擎
  - 流程实例管理
  - 执行状态跟踪
  - 错误处理
  - 重试机制
- 流程监控
  - 执行历史
  - 性能监控
  - 日志追踪

**技术实现**:
```typescript
// 工作流定义
interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  status: 'draft' | 'active' | 'paused';
  version: number;
}

interface WorkflowNode {
  id: string;
  type: 'query' | 'transform' | 'condition' | 'loop' | 'api' | 'notify';
  config: any;
  position: { x: number; y: number };
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output: any;
  logs: ExecutionLog[];
  startedAt: Date;
  completedAt: Date;
}

// 后端API
POST /api/workflows
PUT /api/workflows/:id
DELETE /api/workflows/:id
GET /api/workflows
POST /api/workflows/:id/execute
GET /api/workflows/:id/executions
POST /api/workflows/:id/trigger
```

#### 2.1.7 插件系统 (Plugin System)
**优先级**: P2
**预计工期**: 5-6周

**功能描述**:
提供可扩展的插件机制，支持第三方扩展。

**核心功能**:
- 插件市场
  - 插件列表
  - 插件评分和评论
  - 插件分类
- 插件开发SDK
  - 插件接口定义
  - 开发文档
  - 调试工具
- 插件管理
  - 插件安装/卸载
  - 插件启用/禁用
  - 插件配置
  - 插件依赖管理
- 插件钩子
  - 请求前置钩子
  - 请求后置钩子
  - 响应转换钩子
  - 错误处理钩子

**技术实现**:
```typescript
// 插件定义
interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  hooks: PluginHook[];
  permissions: string[];
  configSchema: any;
  status: 'installed' | 'enabled' | 'disabled';
}

interface PluginHook {
  name: string;
  type: 'before-request' | 'after-request' | 'transform-response' | 'on-error';
  handler: Function;
}

// 插件SDK示例
export abstract class BasePlugin {
  abstract onBeforeRequest(context: RequestContext): Promise<RequestContext>;
  abstract onAfterRequest(context: RequestContext, response: any): Promise<any>;
  abstract transformResponse(data: any): Promise<any>;
  abstract onError(error: Error): Promise<void>;
}

// 后端API
POST /api/plugins/install
DELETE /api/plugins/:id
POST /api/plugins/:id/enable
POST /api/plugins/:id/disable
GET /api/plugins/marketplace
```

#### 2.1.8 监控告警 (Monitoring & Alerting)
**优先级**: P1
**预计工期**: 3-4周

**功能描述**:
完整的系统监控和告警体系。

**核心功能**:
- 系统监控
  - CPU、内存、磁盘监控
  - 网络流量监控
  - 进程监控
- 应用监控
  - 请求量监控
  - 响应时间监控
  - 错误率监控
  - 慢查询监控
- 业务监控
  - 用户活跃度
  - 数据源使用量
  - API调用统计
- 告警规则
  - 告警规则配置
  - 告警级别（INFO/WARN/ERROR/CRITICAL）
  - 告警通道（邮件、短信、Webhook）
- 监控仪表板
  - 实时数据展示
  - 历史趋势图
  - 自定义仪表板

**技术实现**:
```typescript
// 监控指标
interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  timestamp: Date;
  tags: { [key: string]: string };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string; // 查询表达式
  threshold: number;
  duration: number; // 持续时间
  level: 'info' | 'warn' | 'error' | 'critical';
  channels: AlertChannel[];
  enabled: boolean;
}

interface AlertChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack';
  config: any;
}

// 后端API
GET /api/metrics
GET /api/metrics/:name
POST /api/alert-rules
PUT /api/alert-rules/:id
GET /api/alerts
POST /api/alerts/:id/acknowledge
```

#### 2.1.9 日志审计 (Logging & Audit)
**优先级**: P1
**预计工期**: 2-3周

**功能描述**:
完整的操作审计和日志追踪系统。

**核心功能**:
- 审计日志
  - 用户操作记录
  - 数据访问记录
  - 权限变更记录
  - 配置变更记录
- 访问日志
  - API访问日志
  - 数据源访问日志
  - 查询执行日志
- 日志查询
  - 多条件筛选
  - 时间范围查询
  - 日志导出
- 日志分析
  - 异常行为检测
  - 安全事件识别
  - 合规性报告

**技术实现**:
```typescript
// 审计日志
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ip: string;
  userAgent: string;
  result: 'success' | 'failure';
  timestamp: Date;
}

interface AccessLog {
  id: string;
  type: 'api' | 'datasource' | 'query';
  userId: string;
  endpoint: string;
  method: string;
  params: any;
  duration: number;
  status: number;
  timestamp: Date;
}

// 后端API
GET /api/audit-logs
GET /api/access-logs
POST /api/logs/export
GET /api/logs/analysis
```

#### 2.1.10 部署管理 (Deployment Management)
**优先级**: P2
**预计工期**: 4-5周

**功能描述**:
支持一键部署和环境管理。

**核心功能**:
- 环境管理
  - 开发/测试/生产环境
  - 环境配置隔离
  - 环境变量管理
- 部署配置
  - 构建配置
  - Docker配置
  - Kubernetes配置
- 部署流程
  - 一键部署
  - 蓝绿部署
  - 回滚机制
- 版本管理
  - 版本历史
  - 版本对比
  - 版本回滚

**技术实现**:
```typescript
// 部署配置
interface DeploymentConfig {
  id: string;
  name: string;
  environment: 'dev' | 'staging' | 'production';
  buildConfig: BuildConfig;
  deployConfig: DeployConfig;
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

interface Deployment {
  id: string;
  configId: string;
  version: string;
  status: string;
  logs: string[];
  startedAt: Date;
  completedAt: Date;
}

// 后端API
POST /api/deployments
POST /api/deployments/:id/rollback
GET /api/deployments/:id/logs
GET /api/environments
```

### 2.2 前后端交互设计

#### 2.2.1 认证流程
```
┌─────────┐
│ 前端   │
└────┬────┘
     │
     │ 1. 登录请求
     │ POST /api/auth/login
     │ { username, password }
     ▼
┌─────────────────┐
│   后端       │
│               │
│ 2. 验证凭据   │
│ 3. 生成JWT     │
│               │
│ 4. 返回Token   │
└───────┬───────┘
        │
        │ JWT Token
        ▼
┌─────────┐
│ 前端   │
└────┬────┘
     │
     │ 5. 存储Token
     │ 6. 设置请求头
     │ Authorization: Bearer {token}
     │
     │ 7. 后续请求携带Token
     ▼
┌─────────────────┐
│   后端       │
│               │
│ 8. 验证Token   │
│ 9. 检查权限   │
│ 10. 处理请求   │
└───────┬───────┘
        │
        │ 响应数据
        ▼
┌─────────┐
│ 前端   │
└─────────┘
```

#### 2.2.2 查询构建流程
```
┌─────────────────────────────────────────────────────────┐
│                  前端 - 查询构建器                  │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ 1. 用户拖拽组件
                        │ 2. 构建查询状态
                        │
                        │ POST /api/query-builder/validate
                        │ { tables, joins, conditions, ... }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    后端 - Parser/Verifier            │
│                                                    │
│ 3. 验证查询结构 4. 检查权限 5. 生成预览SQL     │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ { valid: true, sql: "...", warnings: [] }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  前端 - 查询预览                  │
│                                                    │
│ 6. 显示预览SQL 7. 用户确认 8. 执行查询        │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ POST /api/query/execute
                        │ { query: "..." }
                        ▼
┌─────────────────────────────────────────────────────────┐
│              后端 - Parser → Builder → Executor         │
│                                                    │
│ 9. 解析 10. 构建 11. 执行 12. 返回结果        │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ { data, total, count, ... }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  前端 - 结果展示                  │
│                                                    │
│ 13. 渲染表格 14. 分页 15. 导出数据             │
└─────────────────────────────────────────────────────────┘
```

#### 2.2.3 数据源连接流程
```
┌─────────────────────────────────────────────────────────┐
│              前端 - 数据源管理                      │
│                                                    │
│ 1. 填写连接信息 2. 选择数据源类型               │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ POST /api/datasources/test
                        │ { type, host, port, database, ... }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 后端 - DatabaseService               │
│                                                    │
│ 3. 建立连接 4. 测试连接 5. 返回状态        │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ { success: true, latency: 50ms }
                        ▼
┌─────────────────────────────────────────────────────────┐
│              前端 - 连接确认                      │
│                                                    │
│ 6. 显示连接成功 7. 保存配置 8. 获取表结构        │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ GET /api/datasources/:id/tables
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 后端 - DatabaseService               │
│                                                    │
│ 9. 查询表结构 10. 缓存元数据 11. 返回结果       │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ { tables: [...], metadata: {...} }
                        ▼
┌─────────────────────────────────────────────────────────┐
│              前端 - 表结构展示                      │
│                                                    │
│ 12. 显示表列表 13. 可视化ER图 14. 字段详情     │
└─────────────────────────────────────────────────────────┘
```

#### 2.2.4 工作流执行流程
```
┌─────────────────────────────────────────────────────────┐
│              前端 - 工作流设计器                    │
│                                                    │
│ 1. 拖拽节点 2. 连接节点 3. 配置参数         │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ POST /api/workflows
                        │ { name, nodes, edges, ... }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 后端 - WorkflowService              │
│                                                    │
│ 4. 保存工作流 5. 验证节点 6. 返回ID         │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ POST /api/workflows/:id/execute
                        │ { input: {...} }
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 后端 - WorkflowEngine              │
│                                                    │
│ 7. 初始化上下文 8. 执行节点 9. 传递数据       │
│   ┌──────────────────────────────────────────────┐   │
│   │ 节点1 → 节点2 → 节点3 → ...     │   │
│   └──────────────────────────────────────────────┘   │
│                                                    │
│ 10. 收集结果 11. 记录日志 12. 返回输出       │
└───────────────────────────┬─────────────────────────┘
                        │
                        │ { executionId, output, logs: [...] }
                        ▼
┌─────────────────────────────────────────────────────────┐
│              前端 - 执行结果                      │
│                                                    │
│ 13. 显示执行状态 14. 实时日志 15. 最终结果     │
└─────────────────────────────────────────────────────────┘
```

## 3. 开发阶段规划

### 第一阶段：基础功能完善（1-2个月）
1. 可视化查询构建器
2. 数据源管理
3. 用户权限系统
4. 基础监控

### 第二阶段：高级功能（2-3个月）
1. API管理
2. 数据模型管理
3. 工作流编排
4. 日志审计

### 第三阶段：扩展功能（3-4个月）
1. 插件系统
2. 监控告警
3. 部署管理
4. 高级分析

### 第四阶段：优化和迭代（持续）
1. 性能优化
2. 用户体验优化
3. 安全加固
4. 文档完善

## 4. 技术架构建议

### 4.1 前端技术栈
- **框架**: React 18 / Vue 3
- **UI库**: Ant Design / Element Plus
- **状态管理**: Redux Toolkit / Pinia
- **图表库**: ECharts / Recharts
- **流程图**: React Flow / XFlow
- **表单**: Formily / Form Render
- **构建工具**: Vite

### 4.2 后端技术栈
- **框架**: NestJS（已有）
- **ORM**: TypeORM / Prisma（替代原生SQL）
- **缓存**: Redis（分布式缓存）
- **消息队列**: RabbitMQ / Kafka（异步任务）
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack / Loki

### 4.3 基础设施
- **容器化**: Docker
- **编排**: Kubernetes
- **CI/CD**: GitHub Actions / GitLab CI
- **服务网格**: Istio（可选）
- **API网关**: Kong / Nginx

## 5. API设计规范

### 5.1 统一响应格式
```typescript
interface ApiResponse<T = any> {
  status: 'success' | 'error';
  code: number;
  message: string;
  data?: T;
  errors?: string[];
  warnings?: string[];
  meta?: {
    processingTime: number;
    timestamp: string;
    requestId: string;
  };
}
```

### 5.2 分页格式
```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 5.3 错误码规范
```typescript
enum ErrorCode {
  // 通用错误 1000-1999
  SUCCESS = 0,
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMS = 1001,
  
  // 认证错误 2000-2999
  UNAUTHORIZED = 2001,
  TOKEN_EXPIRED = 2002,
  PERMISSION_DENIED = 2003,
  
  // 数据源错误 3000-3999
  DATASOURCE_NOT_FOUND = 3001,
  DATASOURCE_CONNECTION_FAILED = 3002,
  
  // 查询错误 4000-4999
  INVALID_QUERY = 4001,
  QUERY_TIMEOUT = 4002,
  
  // 工作流错误 5000-5999
  WORKFLOW_NOT_FOUND = 5001,
  WORKFLOW_EXECUTION_FAILED = 5002,
}
```

## 6. 总结

当前APIJSON项目作为低代码平台后台，已具备基础的APIJSON处理能力，但距离完整的低代码平台还需要大量的功能开发。建议按照上述规划分阶段实施，优先完成核心功能（查询构建器、数据源管理、权限系统），再逐步扩展高级功能。
