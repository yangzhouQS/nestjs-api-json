# 数据库测试快速开始指南

本指南帮助你快速开始使用真实的 MySQL 数据库进行测试。

## 5 分钟快速开始

### 步骤 1: 安装 MySQL

确保你的系统上已安装 MySQL 5.7 或更高版本。

**检查 MySQL 是否已安装：**

```bash
mysql --version
```

**如果没有安装，请根据你的操作系统安装：**

- **Windows**: 下载并安装 [MySQL Installer](https://dev.mysql.com/downloads/installer/)
- **macOS**: `brew install mysql`
- **Linux**: `sudo apt-get install mysql-server`

### 步骤 2: 启动 MySQL 服务

```bash
# Windows
net start MySQL

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### 步骤 3: 配置测试环境

```bash
cd nest-src
cp .env.example .env.test
```

编辑 `.env.test` 文件，确保数据库配置正确：

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=apijson_test
```

### 步骤 4: 运行测试

```bash
# 运行所有集成测试
npm run test:db
```

就这么简单！🎉

## 常用命令

### 测试命令

```bash
# 运行所有集成测试
npm run test:db

# 监听模式运行测试（代码修改时自动重新运行）
npm run test:db:watch

# 生成测试覆盖率报告
npm run test:db:cov

# 运行特定测试文件
USE_REAL_DATABASE=true npm run test -- database.service.integration.spec.ts
```

### 数据库管理命令

```bash
# 初始化测试数据库
npm run test:db:init

# 清理测试数据
npm run test:db:clean

# 重置测试数据库（删除并重新创建）
npm run test:db:reset
```

## 测试模式对比

### Mock 测试（默认）

```bash
npm test
```

**优点：**
- ✅ 不需要真实的数据库
- ✅ 测试速度快
- ✅ 适合快速迭代

**缺点：**
- ❌ 无法发现真实数据库的问题
- ❌ 测试结果可能不准确

### 真实数据库测试

```bash
npm run test:db
```

**优点：**
- ✅ 使用真实的 MySQL 数据库
- ✅ 测试结果更准确
- ✅ 可以发现真实环境中的问题
- ✅ 支持复杂的 SQL 查询测试

**缺点：**
- ❌ 需要安装和配置 MySQL
- ❌ 测试速度相对较慢
- ❌ 需要管理测试数据

## 编写第一个集成测试

创建一个简单的集成测试文件 `my-service.integration.spec.ts`：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { testDbHelper } from '@/test/database/test-db-helper';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('MyService - Integration Tests', () => {
  let service: DatabaseService;

  beforeAll(async () => {
    // 跳过测试如果未启用真实数据库
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    // 确保测试数据库已初始化
    await testDbHelper.initialize();

    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    if (service) {
      await service.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    if (process.env.USE_REAL_DATABASE) {
      await testDbHelper.cleanupData();
    }
  });

  it('应该查询用户数据', async () => {
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    const result = await service.query('SELECT * FROM users');
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('应该插入新用户', async () => {
    if (!process.env.USE_REAL_DATABASE) {
      return;
    }

    await service.query(
      'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
      ['Test User', 'test@example.com', 30]
    );

    const result = await service.query(
      'SELECT * FROM users WHERE email = ?',
      ['test@example.com']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Test User');
  });
});
```

运行测试：

```bash
USE_REAL_DATABASE=true npm run test -- my-service.integration.spec.ts
```

## 常见问题

### Q1: 如何检查 MySQL 是否正在运行？

```bash
# Windows
sc query MySQL

# macOS/Linux
sudo systemctl status mysql
# 或
brew services list  # macOS
```

### Q2: 如何重置 MySQL root 密码？

```bash
# 停止 MySQL 服务
sudo systemctl stop mysql

# 以安全模式启动 MySQL
sudo mysqld_safe --skip-grant-tables &

# 连接到 MySQL
mysql -u root

# 重置密码
USE mysql;
UPDATE user SET authentication_string=PASSWORD('new_password') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL 服务
sudo systemctl restart mysql
```

### Q3: 如何查看测试数据库的内容？

```bash
# 连接到 MySQL
mysql -u root -p

# 使用测试数据库
USE apijson_test;

# 查看所有表
SHOW TABLES;

# 查询数据
SELECT * FROM users;
```

### Q4: 测试失败怎么办？

1. 检查 MySQL 服务是否正在运行
2. 检查 `.env.test` 中的数据库配置
3. 尝试重置测试数据库：`npm run test:db:reset`
4. 查看详细的错误信息

### Q5: 如何在 CI/CD 中使用？

参考 [数据库测试指南](database-testing-guide.md#持续集成) 中的 GitHub Actions 示例。

## 下一步

- 📖 阅读完整的 [数据库测试指南](database-testing-guide.md)
- 🔧 查看 [测试系统说明](../src/test/README.md)
- 💡 了解 [测试最佳实践](database-testing-guide.md#最佳实践)

## 获取帮助

如果遇到问题：

1. 查看错误日志
2. 检查 MySQL 日志
3. 参考 [故障排除](database-testing-guide.md#故障排除) 章节
4. 提交 Issue 到项目仓库

## 许可证

MIT
