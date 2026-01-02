# 测试系统说明

本目录包含 nest-src 项目的测试相关文件和配置。

## 目录结构

```
test/
├── database/
│   ├── init-test-db.sql          # 测试数据库初始化脚本
│   └── test-db-helper.ts        # 测试数据库辅助类
├── e2e/                         # 端到端测试
│   └── apijson.e2e-spec.ts
├── utils/                       # 测试工具函数
│   └── test-helpers.ts
├── global.d.ts                  # 全局类型定义
└── setup.ts                     # 测试环境设置
```

## 功能特性

### 1. 双模式测试支持

- **Mock 测试模式**：使用模拟的数据库连接，快速执行单元测试
- **真实数据库测试模式**：使用真实的 MySQL 数据库进行集成测试

### 2. 自动化数据库管理

- 自动创建和初始化测试数据库
- 自动清理测试数据
- 支持数据库重置

### 3. 完整的测试数据

- 预定义的测试表结构
- 初始测试数据
- 支持自定义测试数据

## 快速开始

### 1. 配置测试环境

```bash
# 复制测试环境配置
cp .env.example .env.test
```

### 2. 运行 Mock 测试（默认）

```bash
npm test
```

### 3. 运行真实数据库测试

```bash
# 确保MySQL服务正在运行
# 然后运行测试
USE_REAL_DATABASE=true npm test

# 或使用快捷命令
npm run test:db
```

## 测试命令

### 基本测试命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e
```

### 真实数据库测试命令

```bash
# 运行所有集成测试（使用真实数据库）
npm run test:db

# 监听模式运行测试
npm run test:db:watch

# 生成覆盖率报告
npm run test:db:cov
```

### 数据库管理命令

```bash
# 初始化测试数据库
npm run test:db:init

# 清理测试数据
npm run test:db:clean

# 重置测试数据库
npm run test:db:reset
```

## 测试数据库

### 数据库配置

测试数据库配置在 `.env.test` 文件中：

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=apijson_test
```

### 数据库结构

测试数据库包含以下表：

- `users` - 用户表
- `roles` - 角色表
- `user_roles` - 用户角色关联表
- `moments` - 动态表
- `comments` - 评论表
- `verifies` - 验证码表
- `logins` - 登录记录表

### 初始数据

测试数据库初始化时会自动插入：

- 3 个角色
- 5 个用户
- 用户角色关联
- 5 条动态
- 5 条评论

## 编写测试

### 单元测试示例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { describe, it, expect } from 'vitest';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('应该定义服务', () => {
    expect(service).toBeDefined();
  });

  it('应该执行某个操作', async () => {
    const result = await service.doSomething();
    expect(result).toBe('expected value');
  });
});
```

### 集成测试示例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { testDbHelper } from '@/test/database/test-db-helper';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('MyService - Integration Tests', () => {
  let service: MyService;

  beforeAll(async () => {
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    await testDbHelper.initialize();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  afterAll(async () => {
    if (service) {
      await service.close();
    }
  });

  beforeEach(async () => {
    if (process.env.USE_REAL_DATABASE) {
      await testDbHelper.cleanupData();
    }
  });

  it('应该使用真实数据库', async () => {
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    const result = await service.query('SELECT * FROM users');
    expect(result.rows).toBeDefined();
  });
});
```

### 使用测试数据库辅助类

```typescript
import { testDbHelper } from '@/test/database/test-db-helper';

describe('My Test Suite', () => {
  it('应该直接查询测试数据库', async () => {
    const result = await testDbHelper.query(
      'SELECT * FROM users WHERE id = ?',
      [1]
    );
    
    expect(result.rows).toHaveLength(1);
  });
});
```

## 最佳实践

### 1. 测试隔离

每个测试应该独立运行：

```typescript
beforeEach(async () => {
  await testDbHelper.cleanupData();
});
```

### 2. 使用事务

对于修改数据的测试，使用事务：

```typescript
it('应该测试数据修改', async () => {
  const connection = await testDbHelper.getConnection();
  
  try {
    await connection.beginTransaction();
    // 测试代码
    await connection.rollback();
  } finally {
    connection.release();
  }
});
```

### 3. 清理资源

确保在测试后清理资源：

```typescript
afterAll(async () => {
  if (service) {
    await service.close();
  }
});
```

### 4. 跳过条件

在未启用真实数据库时跳过测试：

```typescript
it('应该使用真实数据库', async () => {
  if (!process.env.USE_REAL_DATABASE) {
    return; // 跳过测试
  }

  // 测试代码
});
```

## 故障排除

### 问题：无法连接到 MySQL

**解决方案**：
1. 检查 MySQL 服务是否正在运行
2. 检查 `.env.test` 中的数据库配置
3. 确保用户有足够的权限

### 问题：数据库不存在

**解决方案**：
```bash
npm run test:db:init
```

### 问题：测试数据污染

**解决方案**：
1. 确保每个测试都调用了 `testDbHelper.cleanupData()`
2. 使用事务进行测试

## 更多信息

详细的测试指南请参考：[数据库测试指南](../docs/database-testing-guide.md)

## 贡献

在提交测试代码前，请确保：

1. 所有测试通过：`npm test`
2. 代码覆盖率满足要求：`npm run test:cov`
3. 真实数据库测试通过：`npm run test:db`
4. 代码符合项目规范

## 许可证

MIT
