# 数据库测试指南

本文档说明如何使用真实的 MySQL 数据库进行 nest-src 项目的单元测试和集成测试。

## 目录

- [概述](#概述)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [测试模式](#测试模式)
- [测试数据库结构](#测试数据库结构)
- [运行测试](#运行测试)
- [编写集成测试](#编写集成测试)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 概述

本项目支持两种测试模式：

1. **Mock 测试模式**（默认）：使用模拟的数据库连接，不需要真实的数据库
2. **真实数据库测试模式**：使用真实的 MySQL 数据库进行测试，提供更准确的测试结果

## 前置要求

### 1. 安装 MySQL

确保你的系统上已安装 MySQL 5.7 或更高版本：

- **Windows**: 下载并安装 [MySQL Installer](https://dev.mysql.com/downloads/installer/)
- **macOS**: 使用 Homebrew 安装 `brew install mysql`
- **Linux**: 使用包管理器安装，如 `sudo apt-get install mysql-server`

### 2. 配置 MySQL

启动 MySQL 服务：

```bash
# Windows
net start MySQL

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### 3. 创建测试用户（可选）

如果不想使用 root 用户，可以创建一个专门的测试用户：

```sql
CREATE USER 'test_user'@'localhost' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON apijson_test.* TO 'test_user'@'localhost';
FLUSH PRIVILEGES;
```

然后更新 `.env.test` 文件中的数据库配置：

```env
DB_USERNAME=test_user
DB_PASSWORD=test_password
```

## 快速开始

### 1. 配置测试环境

复制测试环境配置文件：

```bash
cp .env.example .env.test
```

### 2. 运行真实数据库测试

```bash
# 运行所有集成测试
npm run test:db

# 运行特定测试文件
USE_REAL_DATABASE=true npm run test -- database.service.integration.spec.ts

# 监听模式运行测试
npm run test:db:watch

# 生成测试覆盖率报告
npm run test:db:cov
```

## 测试模式

### Mock 测试模式（默认）

```bash
npm test
```

特点：
- 不需要真实的数据库
- 测试速度快
- 适合单元测试和快速迭代

### 真实数据库测试模式

```bash
USE_REAL_DATABASE=true npm test
```

特点：
- 使用真实的 MySQL 数据库
- 测试结果更准确
- 适合集成测试和端到端测试
- 可以发现真实环境中的问题

## 测试数据库结构

测试数据库 `apijson_test` 包含以下表：

### 核心表

- `users` - 用户表
- `roles` - 角色表
- `user_roles` - 用户角色关联表
- `moments` - 动态表
- `comments` - 评论表
- `verifies` - 验证码表
- `logins` - 登录记录表

### 视图

- `user_details` - 用户详细信息视图，包含用户角色、动态和评论统计

### 存储过程

- `clean_test_data()` - 清理测试数据并重置为初始状态

### 初始数据

测试数据库初始化时会自动插入以下测试数据：

- 3 个角色（admin, user, guest）
- 5 个用户（Alice, Bob, Charlie, David, Eve）
- 用户角色关联
- 5 条动态
- 5 条评论

## 运行测试

### 基本测试命令

```bash
# 运行所有单元测试（使用 Mock）
npm run test:unit

# 运行所有集成测试（使用真实数据库）
npm run test:integration

# 运行所有端到端测试
npm run test:e2e

# 运行所有测试
npm test
```

### 真实数据库测试命令

```bash
# 运行所有集成测试
npm run test:db

# 监听模式运行测试
npm run test:db:watch

# 生成覆盖率报告
npm run test:db:cov

# 运行特定测试
USE_REAL_DATABASE=true npm run test -- database.service.integration.spec.ts
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

### 高级选项

```bash
# 只运行匹配特定名称的测试
USE_REAL_DATABASE=true TEST_NAME_PATTERN="should connect" npm run test:db

# 并行运行测试（不推荐用于数据库测试）
USE_REAL_DATABASE=true npm run test:db -- --pool=threads

# 显示详细输出
USE_REAL_DATABASE=true npm run test:db -- --reporter=verbose
```

## 编写集成测试

### 基本结构

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { testDbHelper } from '@/test/database/test-db-helper';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('MyService - Integration Tests', () => {
  let service: MyService;

  beforeAll(async () => {
    // 跳过测试如果未启用真实数据库
    if (!process.env.USE_REAL_DATABASE) {
      console.log('⚠️  跳过集成测试：未启用真实数据库');
      return;
    }

    // 确保测试数据库已初始化
    await testDbHelper.initialize();

    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        // 其他依赖
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  afterAll(async () => {
    // 清理资源
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    if (process.env.USE_REAL_DATABASE) {
      await testDbHelper.cleanupData();
    }
  });

  it('应该成功执行某个操作', async () => {
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    // 测试代码
    const result = await service.someMethod();
    expect(result).toBeDefined();
  });
});
```

### 使用测试数据库辅助类

```typescript
import { testDbHelper } from '@/test/database/test-db-helper';

describe('My Test Suite', () => {
  it('应该直接查询测试数据库', async () => {
    // 执行查询
    const result = await testDbHelper.query(
      'SELECT * FROM users WHERE id = ?',
      [1]
    );
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Alice');
  });

  it('应该获取数据库连接', async () => {
    const connection = await testDbHelper.getConnection();
    
    try {
      // 使用连接执行操作
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
      expect(rows[0].count).toBe(5);
    } finally {
      // 释放连接
      connection.release();
    }
  });
});
```

### 测试事务操作

```typescript
it('应该成功执行事务', async () => {
  const queries = [
    { sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)', params: ['Test User', 'test@example.com', 30] },
    { sql: 'INSERT INTO moments (user_id, content) VALUES (?, ?)', params: [6, 'Test moment'] },
  ];

  const results = await service.executeTransaction(queries);
  expect(results).toHaveLength(2);
  expect(results[0].affectedRows).toBe(1);
});
```

## 故障排除

### 问题 1: 无法连接到 MySQL

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案**:
1. 检查 MySQL 服务是否正在运行
2. 检查 `.env.test` 中的 `DB_HOST` 和 `DB_PORT` 配置
3. 检查防火墙设置

### 问题 2: 认证失败

**错误信息**: `Error: Access denied for user 'root'@'localhost'`

**解决方案**:
1. 检查 `.env.test` 中的 `DB_USERNAME` 和 `DB_PASSWORD` 配置
2. 确保用户有足够的权限
3. 尝试创建专门的测试用户

### 问题 3: 数据库不存在

**错误信息**: `Error: Unknown database 'apijson_test'`

**解决方案**:
1. 运行 `npm run test:db:init` 初始化测试数据库
2. 或者手动创建数据库：`CREATE DATABASE apijson_test;`

### 问题 4: 测试数据污染

**症状**: 测试之间相互影响

**解决方案**:
1. 确保每个测试套件都调用了 `testDbHelper.cleanupData()`
2. 使用事务进行测试，测试后回滚
3. 检查测试是否正确清理了数据

### 问题 5: 测试超时

**症状**: 测试运行时间过长或超时

**解决方案**:
1. 增加测试超时时间：在 `vitest.config.ts` 中设置 `testTimeout`
2. 优化测试查询
3. 使用索引提高查询性能

## 最佳实践

### 1. 测试隔离

每个测试应该独立运行，不依赖其他测试的状态：

```typescript
beforeEach(async () => {
  // 清理数据，确保测试隔离
  await testDbHelper.cleanupData();
});
```

### 2. 使用事务进行测试

对于可能修改数据的测试，使用事务并在测试后回滚：

```typescript
it('应该测试数据修改', async () => {
  const connection = await testDbHelper.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 执行测试操作
    await connection.query('INSERT INTO users SET ?', { name: 'Test' });
    
    // 验证结果
    const [rows] = await connection.query('SELECT * FROM users WHERE name = ?', ['Test']);
    expect(rows).toHaveLength(1);
    
    // 回滚事务
    await connection.rollback();
  } finally {
    connection.release();
  }
});
```

### 3. 合理使用测试数据

- 使用有意义的测试数据，而不是随机数据
- 测试数据应该覆盖各种边界情况
- 避免使用生产环境的真实数据

### 4. 测试覆盖率

确保测试覆盖所有重要的代码路径：

```bash
# 生成覆盖率报告
npm run test:db:cov

# 查看覆盖率报告
open coverage/index.html
```

### 5. 性能测试

对于关键操作，添加性能测试：

```typescript
it('应该在合理时间内完成查询', async () => {
  const startTime = Date.now();
  await service.query('SELECT * FROM users');
  const endTime = Date.now();
  
  const duration = endTime - startTime;
  expect(duration).toBeLessThan(1000); // 应该在1秒内完成
});
```

### 6. 错误处理测试

确保测试各种错误情况：

```typescript
it('应该处理SQL语法错误', async () => {
  await expect(service.query('INVALID SQL')).rejects.toThrow();
});

it('应该处理连接失败', async () => {
  // 模拟连接失败
  // 测试错误处理逻辑
});
```

### 7. 并发测试

测试并发场景：

```typescript
it('应该支持并发查询', async () => {
  const queries = Array(10).fill(null).map(() => 
    service.query('SELECT * FROM users LIMIT 1')
  );

  const results = await Promise.all(queries);
  expect(results).toHaveLength(10);
});
```

### 8. 清理资源

确保在测试后正确清理资源：

```typescript
afterAll(async () => {
  if (service) {
    await service.close();
  }
});
```

## 持续集成

在 CI/CD 环境中使用真实数据库测试：

### GitHub Actions 示例

```yaml
name: Test with Real Database

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: apijson_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with real database
        run: npm run test:db
        env:
          USE_REAL_DATABASE: true
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_USERNAME: root
          DB_PASSWORD: password
          DB_DATABASE: apijson_test
```

## 总结

使用真实数据库进行测试可以提供更准确的测试结果，帮助发现真实环境中的问题。通过遵循本文档的指南和最佳实践，你可以有效地编写和维护数据库集成测试。

如有任何问题或建议，请随时联系开发团队。
