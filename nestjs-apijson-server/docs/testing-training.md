# APIJSON NestJS 测试培训文档

## 目录

1. [测试架构说明](#测试架构说明)
2. [环境配置](#环境配置)
3. [执行规范](#执行规范)
4. [持续维护指南](#持续维护指南)
5. [测试最佳实践](#测试最佳实践)
6. [常见问题解答](#常见问题解答)

## 测试架构说明

### 测试金字塔

本项目采用测试金字塔架构，确保测试的平衡和高效：

```
        /\
       /E2E\          端到端测试 (5%)
      /------\
     / 集成测试 \       集成测试 (15%)
    /----------\
   /  单元测试   \      单元测试 (80%)
  /--------------\
```

### 测试分层

| 测试类型 | 覆盖率目标 | 执行时间 | 维护成本 |
|---------|-----------|---------|---------|
| 单元测试 | ≥90% | <5分钟 | 低 |
| 集成测试 | ≥70% | <10分钟 | 中 |
| 端到端测试 | ≥60% | <15分钟 | 高 |

### 测试目录结构

```
src/
├── modules/
│   ├── parser/
│   │   ├── parser.service.ts
│   │   └── parser.service.spec.ts      # 单元测试
│   ├── verifier/
│   │   ├── verifier.service.ts
│   │   └── verifier.service.spec.ts
│   ├── builder/
│   │   ├── builder.service.ts
│   │   └── builder.service.spec.ts
│   ├── executor/
│   │   ├── executor.service.ts
│   │   └── executor.service.spec.ts
│   └── cache/
│       ├── cache.service.ts
│       └── cache.service.spec.ts
├── common/
│   ├── guards/
│   │   ├── apijson-auth.guard.ts
│   │   └── apijson-auth.guard.spec.ts
│   ├── pipes/
│   │   ├── apijson-validation.pipe.ts
│   │   └── apijson-validation.pipe.spec.ts
│   └── filters/
│       ├── apijson-exception.filter.ts
│       └── apijson-exception.filter.spec.ts
└── test/
    ├── setup.ts                          # 测试环境设置
    ├── utils/
    │   └── test-helpers.ts              # 测试辅助工具
    ├── unit/                              # 单元测试（可选）
    ├── integration/                         # 集成测试（可选）
    └── e2e/
        └── apijson.e2e-spec.ts          # 端到端测试
```

## 环境配置

### 开发环境配置

#### 1. 安装依赖

```bash
# 安装项目依赖
npm install

# 或使用 pnpm
pnpm install
```

#### 2. 配置测试环境

项目已配置好 Vitest 测试环境，位于 [`vitest.config.ts`](vitest.config.ts:1)：

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,                    // 全局API可用
    environment: 'node',                // Node.js环境
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],
    testTimeout: 10000,                // 测试超时10秒
    hookTimeout: 10000,                // Hook超时10秒
    coverage: {
      provider: 'v8',                   // 使用v8覆盖率工具
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'dist/',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts',
        '**/main.ts',
        '**/types/**/*.ts',
      ],
      all: true,                         // 覆盖所有文件
      lines: 80,                         // 行覆盖率目标80%
      functions: 80,                    // 函数覆盖率目标80%
      branches: 80,                      // 分支覆盖率目标80%
      statements: 80,                    // 语句覆盖率目标80%
    },
    setupFiles: ['./src/test/setup.ts'],   # 测试设置文件
    reporters: ['verbose', 'json'],
    outputFile: './test-results/results.json',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),   // 路径别名
    },
  },
});
```

#### 3. 测试设置文件

[`src/test/setup.ts`](src/test/setup.ts:1) 在所有测试运行前执行：

```typescript
import { vi } from 'vitest';

// Mock console方法以减少测试输出噪音
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});

// 全局测试超时设置
vi.setConfig({ testTimeout: 10000 });

// Mock process.env以避免环境变量问题
process.env.NODE_ENV = 'test';

// 设置时区
process.env.TZ = 'UTC';
```

### CI/CD环境配置

#### GitHub Actions 配置示例

创建 `.github/workflows/test.yml`：

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Generate coverage report
        run: npm run test:cov
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Build project
        run: npm run build
      
      - name: Upload coverage artifacts
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
```

### 本地开发环境

#### VS Code 配置

安装推荐的 VS Code 扩展：

1. **Vitest** - Vitest 测试运行器
2. **Coverage Gutters** - 代码覆盖率可视化
3. **Jest Runner** - Jest/Vitest 测试运行器（兼容）

#### 调试测试

在 VS Code 中调试测试：

1. 在测试文件中设置断点
2. 按 F5 或点击"运行和调试"
3. 选择"Vitest: Debug Current Test File"

## 执行规范

### 测试文件命名规范

#### 单元测试

单元测试文件应与源文件同名，使用 `.spec.ts` 扩展名：

```
parser.service.ts          → parser.service.spec.ts
verifier.service.ts        → verifier.service.spec.ts
builder.service.ts         → builder.service.spec.ts
cache.service.ts           → cache.service.spec.ts
apijson-auth.guard.ts      → apijson-auth.guard.spec.ts
apijson-validation.pipe.ts → apijson-validation.pipe.spec.ts
```

#### 集成测试

集成测试文件使用 `.integration.spec.ts` 扩展名：

```
parser.integration.spec.ts
verifier.integration.spec.ts
```

#### 端到端测试

端到端测试文件使用 `.e2e-spec.ts` 扩展名：

```
apijson.e2e-spec.ts
auth.e2e-spec.ts
```

### 测试用例命名规范

使用清晰、描述性的测试名称：

```typescript
describe('ParserService', () => {
  describe('parse', () => {
    it('should parse valid APIJSON request', async () => {});
    it('should throw error for invalid table name', async () => {});
    it('should handle empty request', async () => {});
  });
});
```

### 测试编写规范

#### AAA 模式

使用 Arrange-Act-Assert 模式组织测试：

```typescript
describe('CacheService', () => {
  describe('get', () => {
    it('should return value for existing key', async () => {
      // Arrange (准备)
      const service = new CacheService(mockConfigService);
      await service.set('test-key', 'test-value');
      
      // Act (执行)
      const result = await service.get('test-key');
      
      // Assert (断言)
      expect(result).toBe('test-value');
    });
  });
});
```

#### Given-When-Then 模式

对于复杂场景，使用 Given-When-Then 模式：

```typescript
describe('APIJSONController', () => {
  describe('handleRequest', () => {
    it('should return cached response on second request', async () => {
      // Given (给定)
      const request = createMockAPIJSONRequest();
      const controller = new APIJSONController(...);
      
      // When (当)
      const response1 = await controller.handleRequest(request);
      const response2 = await controller.handleRequest(request);
      
      // Then (那么)
      expect(response1.cached).toBe(false);
      expect(response2.cached).toBe(true);
    });
  });
});
```

### 测试执行命令

#### 运行所有测试

```bash
# 运行所有测试
npm test

# 或使用 vitest 直接运行
npx vitest run
```

#### 运行单元测试

```bash
# 运行单元测试
npm run test:unit

# 或
npx vitest run src/**/*.spec.ts
```

#### 运行特定模块测试

```bash
# 运行 Parser 模块测试
npm run test:unit -- parser

# 或
npx vitest run src/modules/parser/
```

#### 运行特定测试文件

```bash
# 运行特定测试文件
npx vitest run src/modules/parser/parser.service.spec.ts
```

#### 运行特定测试用例

```bash
# 运行匹配名称的测试
npx vitest run -t "should parse valid"

# 或
npx vitest run -t "ParserService"
```

#### 监听模式

```bash
# 监听文件变化自动运行测试
npm run test:watch

# 或
npx vitest watch
```

#### 生成覆盖率报告

```bash
# 生成覆盖率报告
npm run test:cov

# 或
npx vitest run --coverage
```

覆盖率报告将生成在 `coverage/` 目录：
- `coverage/index.html` - HTML格式报告
- `coverage/lcov.info` - LCOV格式报告
- `coverage/coverage-final.json` - JSON格式报告

#### UI 模式

```bash
# 启动 Vitest UI
npm run test:ui

# 或
npx vitest --ui
```

### 质量门禁

#### 覆盖率要求

| 指标类型 | 阈值 | 说明 |
|---------|------|------|
| 行覆盖率 | ≥80% | 代码行覆盖率 |
| 函数覆盖率 | ≥80% | 函数覆盖率 |
| 分支覆盖率 | ≥80% | 条件分支覆盖率 |
| 语句覆盖率 | ≥80% | 语句覆盖率 |
| 核心模块覆盖率 | ≥90% | Parser, Verifier, Builder, Executor |

#### 测试通过率

所有测试必须通过才能合并代码：

```yaml
# .github/workflows/test.yml
- name: Check test results
  run: |
    if [ $? -ne 0 ]; then
      echo "Tests failed"
      exit 1
    fi
```

## 持续维护指南

### 测试代码审查清单

在提交测试代码前，使用以下清单进行自检：

- [ ] 测试用例是否覆盖所有关键路径
- [ ] 测试用例是否包含边界条件
- [ ] Mock对象是否合理
- [ ] 测试是否独立可运行
- [ ] 测试命名是否清晰
- [ ] 测试断言是否充分
- [ ] 是否有测试描述注释
- [ ] 是否清理了测试副作用
- [ ] 是否使用了适当的测试辅助工具
- [ ] 测试文件是否与源文件同名

### 测试更新时机

#### 新增功能时

1. 同步编写单元测试
2. 确保测试覆盖率 ≥90%
3. 编写集成测试验证模块间交互
4. 更新相关文档

#### 修改功能时

1. 更新现有测试用例
2. 添加新的边界条件测试
3. 确保测试覆盖率不下降
4. 更新相关文档

#### 修复Bug时

1. 添加回归测试防止Bug复发
2. 测试Bug修复前后的行为
3. 更新相关文档

#### 重构代码时

1. 确保所有现有测试通过
2. 添加缺失的测试用例
3. 提高测试覆盖率

### 测试文档维护

#### 测试策略文档

- 更新频率：每季度
- 维护人：测试负责人
- 内容：测试范围、优先级、边界条件

#### 测试用例文档

- 更新频率：随代码变更更新
- 维护人：开发人员
- 内容：测试场景、预期结果、实际结果

#### 覆盖率报告

- 生成频率：每次构建
- 存储位置：CI/CD系统
- 格式：HTML + LCOV

## 测试最佳实践

### 1. 测试独立性

每个测试应该独立运行，不依赖其他测试：

```typescript
describe('CacheService', () => {
  beforeEach(() => {
    // 每个测试前清理状态
    cacheService.flush();
  });

  it('test 1', async () => {
    // 测试1
  });

  it('test 2', async () => {
    // 测试2，不依赖test 1
  });
});
```

### 2. 测试可重复性

相同输入应产生相同输出：

```typescript
it('should return consistent results', async () => {
  const input = { id: 1 };
  
  const result1 = await service.process(input);
  const result2 = await service.process(input);
  
  expect(result1).toEqual(result2);
});
```

### 3. 测试快速执行

测试应该快速执行，使用Mock避免慢速操作：

```typescript
// ❌ 不好：使用真实数据库
const result = await realDatabase.query(sql);

// ✅ 好：使用Mock数据库
const mockDatabase = createMockDatabaseService();
const result = await mockDatabase.query(sql);
```

### 4. 测试清晰性

测试名称和断言应该清晰表达意图：

```typescript
// ❌ 不好
it('test 1', async () => {
  expect(result).toBe(true);
});

// ✅ 好
it('should return true when user has admin role', async () => {
  expect(result).toBe(true);
});
```

### 5. 测试完整性

测试应该覆盖正常、异常和边界情况：

```typescript
describe('ParserService', () => {
  describe('parse', () => {
    // 正常情况
    it('should parse valid request', async () => {});
    
    // 异常情况
    it('should throw error for invalid table name', async () => {});
    
    // 边界情况
    it('should handle empty request', async () => {});
    it('should handle very long table name', async () => {});
  });
});
```

### 6. Mock使用规范

#### Mock外部依赖

使用测试辅助工具创建Mock：

```typescript
import { createMockDatabaseService } from '@/test/utils/test-helpers';

describe('ParserService', () => {
  it('should work with mocked database', async () => {
    const mockDatabase = createMockDatabaseService();
    const service = new ParserService(mockDatabase);
    
    const result = await service.parse(request);
    
    expect(result).toBeDefined();
  });
});
```

#### Mock验证

验证Mock是否被正确调用：

```typescript
it('should call database query', async () => {
  const mockDatabase = createMockDatabaseService();
  const service = new ParserService(mockDatabase);
  
  await service.parse(request);
  
  expect(mockDatabase.query).toHaveBeenCalledWith(
    expect.stringContaining('SELECT'),
    expect.any(Array)
  );
});
```

### 7. 异步测试处理

#### 使用async/await

```typescript
it('should handle async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

#### 使用Promise

```typescript
it('should resolve promise', async () => {
  await expect(service.asyncMethod()).resolves.toBeDefined();
});

it('should reject promise', async () => {
  await expect(service.asyncMethod()).rejects.toThrow();
});
```

### 8. 错误测试

#### 测试错误抛出

```typescript
it('should throw error for invalid input', async () => {
  await expect(service.process(null)).rejects.toThrow();
});
```

#### 测试错误类型

```typescript
it('should throw BadRequestException for invalid input', async () => {
  await expect(service.process(null)).rejects.toThrow(BadRequestException);
});
```

#### 测试错误消息

```typescript
it('should throw error with proper message', async () => {
  try {
    await service.process(null);
    fail('Should have thrown error');
  } catch (error) {
    expect(error.message).toBe('Invalid input');
  }
});
```

### 9. 测试数据管理

#### 使用测试数据生成器

```typescript
import { TestDataGenerator } from '@/test/utils/test-helpers';

it('should process generated user data', async () => {
  const user = TestDataGenerator.user();
  const result = await service.process(user);
  
  expect(result).toBeDefined();
});
```

#### 使用固定测试数据

```typescript
const TEST_DATA = {
  validUser: { id: 1, name: 'Test User' },
  invalidUser: { id: -1 },
};

it('should process valid user', async () => {
  const result = await service.process(TEST_DATA.validUser);
  expect(result).toBeDefined();
});
```

### 10. 测试覆盖率优化

#### 优先测试核心路径

```typescript
describe('ParserService', () => {
  // 优先级P0：核心业务逻辑
  describe('parse', () => {
    it('should parse valid request', async () => {});
    it('should parse multiple tables', async () => {});
  });
  
  // 优先级P1：异常处理
  describe('error handling', () => {
    it('should handle invalid input', async () => {});
  });
  
  // 优先级P2：边界条件
  describe('edge cases', () => {
    it('should handle very long input', async () => {});
  });
});
```

#### 使用覆盖率报告

定期查看覆盖率报告，识别未覆盖的代码：

```bash
npm run test:cov
# 打开 coverage/index.html
```

## 常见问题解答

### Q1: 如何运行单个测试文件？

A: 使用文件路径参数：

```bash
npx vitest run src/modules/parser/parser.service.spec.ts
```

### Q2: 如何调试失败的测试？

A: 使用调试模式：

```bash
npx vitest run --inspect-brk
```

然后在 VS Code 中连接调试器。

### Q3: 如何跳过某些测试？

A: 使用 `.skip` 或 `.todo`：

```typescript
describe.skip('ParserService', () => {
  it.skip('should parse valid request', async () => {
    // 跳过此测试
  });
});

it.todo('should implement this test');
```

### Q4: 如何只运行失败的测试？

A: 使用 `--reporter=verbose` 和 `--run` 参数：

```bash
npx vitest run --reporter=verbose
```

### Q5: 如何提高测试覆盖率？

A: 
1. 识别未覆盖的代码路径
2. 添加测试用例覆盖这些路径
3. 使用分支测试覆盖所有条件
4. 测试异常情况

### Q6: 如何处理慢速测试？

A: 使用 `testTimeout` 配置：

```typescript
it('should handle slow operation', async () => {
  // 增加超时时间
}, 30000); // 30秒
```

### Q7: 如何Mock私有方法？

A: 使用测试双模式或重构代码使方法可测试：

```typescript
// 重构前
class Service {
  private async privateMethod() {}
}

// 重构后
class Service {
  async publicMethod() {
    return this.privateMethod();
  }
  
  protected async privateMethod() {} // 改为protected
}
```

### Q8: 如何测试定时器？

A: 使用 Vitest 的定时器Mock：

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('should handle timer', async () => {
  vi.advanceTimersByTime(1000);
});
```

### Q9: 如何测试HTTP请求？

A: 使用 Supertest：

```typescript
import request from 'supertest';

it('should handle HTTP request', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/apijson')
    .send(requestBody)
    .expect(200);
  
  expect(response.body).toBeDefined();
});
```

### Q10: 如何测试文件上传？

A: 使用 Supertest 的 attach 方法：

```typescript
it('should handle file upload', async () => {
  const response = await request(app.getHttpServer())
    .post('/upload')
    .attach('file', Buffer.from('test content'))
    .expect(200);
  
  expect(response.body).toBeDefined();
});
```

## 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [NestJS 测试文档](https://docs.nestjs.com/fundamentals/testing)
- [测试策略文档](./testing-strategy.md)
- [使用指南](./usage-guide.md)

## 总结

本培训文档提供了APIJSON NestJS项目的全面测试指南，包括：

1. **测试架构说明**: 测试金字塔、分层、目录结构
2. **环境配置**: 开发环境、CI/CD、VS Code配置
3. **执行规范**: 命名规范、执行命令、质量门禁
4. **持续维护指南**: 代码审查、更新时机、文档维护
5. **测试最佳实践**: 独立性、可重复性、快速执行等
6. **常见问题解答**: 10个常见问题的解决方案

遵循本指南，可以确保项目的高质量和稳定性。
