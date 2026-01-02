# 低代码平台前后端交互设计

## 1. 交互架构概述

### 1.1 整体架构
```
┌─────────────────────────────────────────────────────────────────┐
│                      前端应用 (React/Vue)                  │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 查询构建器│  │ 数据源管理 │  │ 工作流设计│  │ 监控仪表板│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │               │               │               │         │
└───────┼───────────────┼───────────────┼───────────────┼─────────┘
        │               │               │               │
        └───────────────┴───────────────┴───────────────┘
                        │
                        │ HTTP/HTTPS (REST API)
                        │ JWT Token认证
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NestJS)                │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 认证中间件│  │ 限流中间件 │  │ 日志中间件 │  │ 异常过滤器 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │               │               │               │         │
└───────┼───────────────┼───────────────┼───────────────┼─────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    核心服务层 (NestJS)                 │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Parser    │  │ Builder   │  │ Executor  │  │ Workflow  │ │
│  │ Service   │  │ Service   │  │ Service   │  │ Service   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │               │               │               │         │
└───────┼───────────────┼───────────────┼───────────────┼─────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    数据访问层                             │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ MySQL     │  │ Redis     │  │ MongoDB   │  │ RabbitMQ  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 通信协议
- **协议**: HTTP/1.1, HTTP/2
- **数据格式**: JSON (Content-Type: application/json)
- **认证方式**: JWT Bearer Token
- **压缩**: gzip, deflate
- **编码**: UTF-8

## 2. API接口设计

### 2.1 认证相关接口

#### 2.1.1 用户登录
```typescript
// 请求
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123",
  "captcha": "abc123",  // 可选：验证码
  "rememberMe": true     // 可选：记住登录
}

// 响应
{
  "status": "success",
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "username": "admin",
      "email": "admin@example.com",
      "avatar": "https://...",
      "roles": ["admin"],
      "permissions": ["*"]
    },
    "expiresAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "processingTime": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

#### 2.1.2 刷新令牌
```typescript
// 请求
POST /api/v1/auth/refresh
Content-Type: application/json
Authorization: Bearer {refreshToken}

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 2.1.3 用户登出
```typescript
// 请求
POST /api/v1/auth/logout
Authorization: Bearer {token}

// 响应
{
  "status": "success",
  "code": 0,
  "message": "登出成功"
}
```

### 2.2 查询构建器接口

#### 2.2.1 验证查询
```typescript
// 请求
POST /api/v1/query-builder/validate
Authorization: Bearer {token}
Content-Type: application/json

{
  "tables": [
    {
      "name": "User",
      "alias": "u",
      "columns": ["id", "username", "email"],
      "where": {
        "status": "active",
        "createdAt": { "$gte": "2024-01-01" }
      },
      "joins": [
        {
          "type": "LEFT",
          "table": "Profile",
          "alias": "p",
          "on": "u.id = p.userId"
        }
      ],
      "groupBy": ["department"],
      "orderBy": ["createdAt-"],
      "limit": 20,
      "offset": 0
    }
  ],
  "directives": {
    "@cache": true,
    "@total": true
  }
}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "valid": true,
    "sql": "SELECT u.id, u.username, u.email, p.* FROM User u LEFT JOIN Profile p ON u.id = p.userId WHERE u.status = 'active' AND u.createdAt >= '2024-01-01' GROUP BY u.department ORDER BY u.createdAt DESC LIMIT 20 OFFSET 0",
    "warnings": [
      "建议在createdAt字段上添加索引以提高查询性能"
    ],
    "estimatedRows": 1500,
    "estimatedTime": 50
  }
}
```

#### 2.2.2 执行查询
```typescript
// 请求
POST /api/v1/query/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": {
    "tables": [...],
    "directives": {...}
  },
  "options": {
    "timeout": 30000,      // 超时时间(ms)
    "stream": false,        // 是否流式返回
    "format": "json"       // 返回格式: json, csv, excel
  }
}

// 响应（普通模式）
{
  "status": "success",
  "code": 0,
  "data": {
    "User": [
      { "id": 1, "username": "admin", "email": "admin@example.com" },
      { "id": 2, "username": "user1", "email": "user1@example.com" }
    ],
    "Profile": [
      { "id": 1, "userId": 1, "bio": "..." }
    ],
    "total": 1500,
    "count": 20
  },
  "meta": {
    "processingTime": 125,
    "cached": false,
    "datasource": "mysql_main"
  }
}

// 响应（流式模式）
HTTP/1.1 200 OK
Content-Type: application/json
Transfer-Encoding: chunked

{"data": {"id": 1, ...}}
{"data": {"id": 2, ...}}
{"data": {"id": 3, ...}}
...
```

#### 2.2.3 保存查询模板
```typescript
// 请求
POST /api/v1/query-builder/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "活跃用户查询",
  "description": "查询最近30天的活跃用户",
  "category": "用户管理",
  "query": {
    "tables": [...],
    "directives": {...}
  },
  "tags": ["常用", "用户"],
  "isPublic": false  // 是否公开给其他用户
}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "id": "tpl_abc123",
    "name": "活跃用户查询",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2.2.4 获取查询模板
```typescript
// 请求
GET /api/v1/query-builder/templates?page=1&pageSize=20&category=用户管理&keyword=活跃
Authorization: Bearer {token}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "items": [
      {
        "id": "tpl_abc123",
        "name": "活跃用户查询",
        "description": "查询最近30天的活跃用户",
        "category": "用户管理",
        "tags": ["常用", "用户"],
        "createdAt": "2024-01-01T12:00:00.000Z",
        "usageCount": 156
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

### 2.3 数据源管理接口

#### 2.3.1 创建数据源
```typescript
// 请求
POST /api/v1/datasources
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "生产数据库",
  "type": "mysql",
  "connection": {
    "host": "db.example.com",
    "port": 3306,
    "database": "production_db",
    "username": "readonly_user",
    "password": "encrypted_password",
    "ssl": true,
    "timezone": "Asia/Shanghai"
  },
  "options": {
    "poolSize": 10,
    "timeout": 30000,
    "maxRetries": 3
  }
}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "id": "ds_abc123",
    "name": "生产数据库",
    "type": "mysql",
    "status": "connected",
    "tables": [
      { "name": "User", "rows": 15000 },
      { "name": "Order", "rows": 50000 }
    ],
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2.3.2 测试数据源连接
```typescript
// 请求
POST /api/v1/datasources/:id/test
Authorization: Bearer {token}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "success": true,
    "latency": 45,
    "version": "8.0.33",
    "charset": "utf8mb4",
    "message": "连接成功"
  }
}
```

#### 2.3.3 获取数据源表结构
```typescript
// 请求
GET /api/v1/datasources/:id/tables?includeColumns=true&includeIndexes=true
Authorization: Bearer {token}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "tables": [
      {
        "name": "User",
        "comment": "用户表",
        "engine": "InnoDB",
        "rows": 15000,
        "dataLength": 5242880,
        "columns": [
          {
            "name": "id",
            "type": "int",
            "nullable": false,
            "key": "PRI",
            "extra": "auto_increment"
          },
          {
            "name": "username",
            "type": "varchar",
            "length": 50,
            "nullable": false
          }
        ],
        "indexes": [
          {
            "name": "PRIMARY",
            "columns": ["id"],
            "unique": true
          },
          {
            "name": "idx_username",
            "columns": ["username"],
            "unique": true
          }
        ]
      }
    ]
  }
}
```

### 2.4 工作流接口

#### 2.4.1 创建工作流
```typescript
// 请求
POST /api/v1/workflows
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "订单处理流程",
  "description": "自动处理新订单的完整流程",
  "category": "订单管理",
  "nodes": [
    {
      "id": "node_1",
      "type": "query",
      "name": "查询订单信息",
      "config": {
        "datasourceId": "ds_main",
        "query": {
          "tables": [{
            "name": "Order",
            "where": { "id": "${orderId}" }
          }]
        }
      },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node_2",
      "type": "condition",
      "name": "检查库存",
      "config": {
        "condition": "${order.stock} > 0"
      },
      "position": { "x": 300, "y": 100 }
    },
    {
      "id": "node_3",
      "type": "api",
      "name": "调用支付接口",
      "config": {
        "url": "https://payment.example.com/api/pay",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer ${paymentToken}"
        },
        "body": {
          "orderId": "${orderId}",
          "amount": "${order.amount}"
        }
      },
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "node_1",
      "to": "node_2",
      "condition": null
    },
    {
      "id": "edge_2",
      "from": "node_2",
      "to": "node_3",
      "condition": "success"
    }
  ],
  "variables": [
    {
      "name": "orderId",
      "type": "string",
      "required": true,
      "defaultValue": null
    }
  ],
  "triggers": [
    {
      "type": "webhook",
      "config": {
        "url": "https://example.com/webhook/order-created",
        "secret": "webhook_secret_123"
      }
    }
  ]
}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "id": "wf_abc123",
    "name": "订单处理流程",
    "status": "draft",
    "version": 1,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2.4.2 执行工作流
```typescript
// 请求
POST /api/v1/workflows/:id/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "input": {
    "orderId": "ORD20240101001"
  },
  "options": {
    "async": true,           // 异步执行
    "webhook": "https://example.com/callback",  // 完成回调
    "timeout": 60000        // 超时时间
  }
}

// 响应（同步）
{
  "status": "success",
  "code": 0,
  "data": {
    "executionId": "exec_abc123",
    "status": "completed",
    "output": {
      "paymentResult": {
        "success": true,
        "transactionId": "TXN123456"
      }
    },
    "logs": [
      {
        "timestamp": "2024-01-01T12:00:01.000Z",
        "nodeId": "node_1",
        "level": "info",
        "message": "查询订单信息成功"
      },
      {
        "timestamp": "2024-01-01T12:00:02.000Z",
        "nodeId": "node_2",
        "level": "info",
        "message": "库存检查通过"
      }
    ],
    "startedAt": "2024-01-01T12:00:00.000Z",
    "completedAt": "2024-01-01T12:00:05.000Z",
    "duration": 5000
  }
}

// 响应（异步）
{
  "status": "success",
  "code": 0,
  "data": {
    "executionId": "exec_abc123",
    "status": "running",
    "message": "工作流正在执行中",
    "monitorUrl": "https://example.com/monitor/exec_abc123"
  }
}
```

### 2.5 监控接口

#### 2.5.1 实时指标推送 (WebSocket)
```typescript
// WebSocket连接
ws://api.example.com/ws/metrics?token={token}

// 服务端推送的消息格式
{
  "type": "metric",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "name": "api.request.count",
    "value": 1234,
    "tags": {
      "endpoint": "/api/query/execute",
      "method": "POST",
      "status": "200"
    }
  }
}

{
  "type": "metric",
  "data": {
    "name": "system.cpu.usage",
    "value": 45.5,
    "tags": {
      "host": "server-1"
    }
  }
}
```

#### 2.5.2 查询历史指标
```typescript
// 请求
GET /api/v1/metrics/query/history?from=2024-01-01T00:00:00Z&to=2024-01-01T23:59:59Z&interval=1h
Authorization: Bearer {token}

// 响应
{
  "status": "success",
  "code": 0,
  "data": {
    "series": [
      {
        "name": "query.count",
        "dataPoints": [
          { "timestamp": "2024-01-01T00:00:00.000Z", "value": 100 },
          { "timestamp": "2024-01-01T01:00:00.000Z", "value": 120 },
          { "timestamp": "2024-01-01T02:00:00.000Z", "value": 95 }
        ]
      },
      {
        "name": "query.avgDuration",
        "dataPoints": [
          { "timestamp": "2024-01-01T00:00:00.000Z", "value": 150 },
          { "timestamp": "2024-01-01T01:00:00.000Z", "value": 145 },
          { "timestamp": "2024-01-01T02:00:00.000Z", "value": 160 }
        ]
      }
    ]
  }
}
```

## 3. 前端状态管理设计

### 3.1 全局状态结构
```typescript
interface RootState {
  // 用户状态
  user: {
    currentUser: User | null;
    token: string | null;
    permissions: string[];
    isAuthenticated: boolean;
  };
  
  // 应用状态
  app: {
    loading: boolean;
    error: Error | null;
    theme: 'light' | 'dark';
    language: 'zh-CN' | 'en-US';
  };
  
  // 查询构建器状态
  queryBuilder: {
    selectedTables: TableConfig[];
    joins: JoinConfig[];
    conditions: ConditionNode[];
    groupBy: string[];
    orderBy: OrderConfig[];
    pagination: PaginationConfig;
    previewSql: string | null;
    isValid: boolean;
    warnings: string[];
  };
  
  // 数据源状态
  datasources: {
    list: DataSource[];
    current: DataSource | null;
    tables: TableMetadata[];
    connectionStatus: 'connected' | 'disconnected' | 'testing';
  };
  
  // 工作流状态
  workflow: {
    current: Workflow | null;
    executions: WorkflowExecution[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    executionLogs: ExecutionLog[];
  };
  
  // 监控状态
  monitoring: {
    metrics: MetricData[];
    alerts: Alert[];
    isConnected: boolean;
  };
}
```

### 3.2 状态更新流程
```typescript
// Redux Toolkit 示例
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 异步操作：执行查询
export const executeQuery = createAsyncThunk(
  'query/execute',
  async (query: QueryConfig, { getState, dispatch }) => {
    try {
      // 1. 验证查询
      const validationResult = await api.validateQuery(query);
      if (!validationResult.valid) {
        throw new Error(validationResult.errors.join(', '));
      }
      
      // 2. 执行查询
      const result = await api.executeQuery(query);
      
      // 3. 记录查询历史
      dispatch(addQueryHistory({ query, result }));
      
      return result;
    } catch (error) {
      // 4. 错误处理
      dispatch(showNotification({ 
        type: 'error', 
        message: error.message 
      }));
      throw error;
    }
  }
);

// 查询构建器切片
const queryBuilderSlice = createSlice({
  name: 'queryBuilder',
  initialState: initialQueryBuilderState,
  reducers: {
    // 添加表
    addTable: (state, action) => {
      state.selectedTables.push(action.payload);
      state.isValid = false; // 需要重新验证
    },
    
    // 移除表
    removeTable: (state, action) => {
      state.selectedTables = state.selectedTables.filter(
        t => t.name !== action.payload
      );
      state.joins = state.joins.filter(
        j => j.fromTable !== action.payload && j.toTable !== action.payload
      );
      state.isValid = false;
    },
    
    // 添加条件
    addCondition: (state, action) => {
      state.conditions.push(action.payload);
      state.isValid = false;
    },
    
    // 更新预览SQL
    updatePreviewSql: (state, action) => {
      state.previewSql = action.payload;
    },
    
    // 设置验证状态
    setValidationStatus: (state, action) => {
      state.isValid = action.payload.valid;
      state.warnings = action.payload.warnings || [];
    }
  },
  extraReducers: (builder) => ({
    // 异步操作处理
    [executeQuery.pending]: (state) => {
      state.loading = true;
      state.error = null;
    },
    [executeQuery.fulfilled]: (state, action) => {
      state.loading = false;
      state.result = action.payload;
    },
    [executeQuery.rejected]: (state, action) => {
      state.loading = false;
      state.error = action.error;
    }
  })
});
```

## 4. 实时通信设计

### 4.1 WebSocket连接
```typescript
// 前端WebSocket管理
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(token: string) {
    this.ws = new WebSocket(
      `wss://api.example.com/ws?token=${token}`
    );
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.sendHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'metric':
        // 更新监控数据
        store.dispatch(updateMetric(message.data));
        break;
      case 'alert':
        // 显示告警
        store.dispatch(showAlert(message.data));
        break;
      case 'notification':
        // 显示通知
        store.dispatch(showNotification(message.data));
        break;
    }
  }
  
  private sendHeartbeat() {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 每30秒发送一次心跳
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(store.getState().user.token);
      }, 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }
}
```

### 4.2 Server-Sent Events (SSE)
```typescript
// SSE连接
class EventSourceManager {
  private eventSource: EventSource | null = null;
  
  connect(url: string, token: string) {
    this.eventSource = new EventSource(
      `${url}?token=${token}`
    );
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };
    
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
  }
  
  private handleEvent(event: SSEEvent) {
    switch (event.type) {
      case 'query-progress':
        // 更新查询进度
        store.dispatch(updateQueryProgress(event.data));
        break;
      case 'workflow-status':
        // 更新工作流状态
        store.dispatch(updateWorkflowStatus(event.data));
        break;
    }
  }
}
```

## 5. 错误处理设计

### 5.1 统一错误处理
```typescript
// 前端错误拦截器
class ApiErrorInterceptor {
  intercept(error: any) {
    // 1. 网络错误
    if (!error.response) {
      showNotification({
        type: 'error',
        message: '网络连接失败，请检查网络设置'
      });
      return;
    }
    
    // 2. HTTP状态码错误
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 401:
        // Token过期，自动刷新
        refreshToken();
        break;
      case 403:
        showNotification({
          type: 'error',
          message: '权限不足，请联系管理员'
        });
        break;
      case 429:
        showNotification({
          type: 'warning',
          message: '请求过于频繁，请稍后再试'
        });
        break;
      case 500:
        reportErrorToServer(error);
        showNotification({
          type: 'error',
          message: '服务器错误，已记录并上报'
        });
        break;
    }
    
    // 3. 业务错误
    if (data.code !== 0) {
      showNotification({
        type: 'error',
        message: data.message || '操作失败'
      });
      
      // 显示详细错误
      if (data.errors && data.errors.length > 0) {
        showErrorDetails(data.errors);
      }
    }
  }
}
```

### 5.2 重试机制
```typescript
// 指数退避重试
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // 指数退避
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
    }
  }
}

// 使用示例
const result = await retryWithBackoff(
  () => api.executeQuery(query),
  3,
  1000
);
```

## 6. 性能优化设计

### 6.1 请求优化
```typescript
// 请求去重
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async request<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // 如果有相同请求正在进行，返回同一个Promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// 使用示例
const result = await requestDeduplicator.request(
  `query:${JSON.stringify(query)}`,
  () => api.executeQuery(query)
);
```

### 6.2 数据缓存
```typescript
// 前端缓存策略
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  
  set(key: string, value: any, ttl: number = 60000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  // 预取数据
  async prefetch(keys: string[]) {
    const promises = keys.map(key => 
      api.getCache(key).then(data => {
        if (data) this.set(key, data);
      })
    );
    await Promise.all(promises);
  }
}
```

## 7. 安全设计

### 7.1 Token管理
```typescript
// Token自动刷新
class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  
  async refreshToken() {
    try {
      const response = await api.refreshToken();
      store.dispatch(updateToken(response.data.token));
      store.dispatch(updateUser(response.data.user));
      
      // 设置下一次刷新时间
      this.scheduleRefresh(response.data.expiresAt);
    } catch (error) {
      // 刷新失败，跳转登录页
      store.dispatch(logout());
      router.push('/login');
    }
  }
  
  scheduleRefresh(expiresAt: Date) {
    // 在过期前5分钟刷新
    const refreshTime = new Date(expiresAt.getTime() - 5 * 60 * 1000);
    const delay = refreshTime.getTime() - Date.now();
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, delay);
  }
}
```

### 7.2 权限检查
```typescript
// 前端权限检查
class PermissionChecker {
  hasPermission(permission: string): boolean {
    const user = store.getState().user.currentUser;
    if (!user) return false;
    
    return user.permissions.includes('*') || 
           user.permissions.includes(permission);
  }
  
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }
  
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }
  
  // React权限组件
  PermissionGate: React.FC<{
    permissions: string[];
    fallback?: React.ReactNode;
  }> = ({ permissions, fallback, children }) => {
    const hasAccess = this.hasAllPermissions(permissions);
    
    if (!hasAccess && fallback) {
      return <>{fallback}</>;
    }
    
    return hasAccess ? <>{children}</> : null;
  };
}

// 使用示例
<PermissionGate 
  permissions={['query:execute', 'datasource:read']}
  fallback={<div>您没有权限访问此功能</div>}
>
  <QueryBuilder />
</PermissionGate>
```

## 8. 总结

本文档详细设计了低代码平台前后端的交互逻辑，包括：
1. 完整的API接口设计
2. 前端状态管理方案
3. 实时通信机制（WebSocket/SSE）
4. 统一错误处理
5. 性能优化策略
6. 安全设计机制

前后端交互遵循RESTful规范，使用JWT认证，支持实时通信，具备完善的错误处理和重试机制，为低代码平台的稳定运行提供了可靠的技术保障。
