# APIJSON NestJS 测试体系文档

## 概述

本文档集提供了APIJSON NestJS项目的完整测试体系文档，包括测试策略、使用指南和培训材料。

## 文档目录

1. **[测试策略文档](./testing-strategy.md)** - 详细的测试策略和规划
2. **[使用指南](./usage-guide.md)** - 项目使用示例和最佳实践
3. **[测试培训文档](./testing-training.md)** - 开发团队测试培训材料

## 测试体系架构

### 测试金字塔

```
        /\
       /E2E\          端到端测试 (5%)
      /------\
     / 集成测试 \       集成测试 (15%)
    /----------\
   /  单元测试   \      单元测试 (80%)
  /--------------\
```

### 测试覆盖范围

| 模块类型 | 测试文件 | 覆盖率目标 | 状态 |
|---------|---------|-----------|------|
| ParserService | [`parser.service.spec.ts`](../src/modules/parser/parser.service.spec.ts) | ≥90% | ✅ 完成 |
| VerifierService | [`verifier.service.spec.ts`](../src/modules/verifier/verifier.service.spec.ts) | ≥90% | ✅ 完成 |
| BuilderService | [`builder.service.spec.ts`](../src/modules/builder/builder.service.spec.ts) | ≥90% | ✅ 完成 |
| CacheService | [`cache.service.spec.ts`](../src/modules/cache/cache.service.spec.ts) | ≥85% | ✅ 完成 |
| APIJSONValidationPipe | [`apijson-validation.pipe.spec.ts`](../src/common/pipes/apijson-validation.pipe.spec.ts) | ≥95% | ✅ 完成 |
| APIJSONAuthGuard | [`apijson-auth.guard.spec.ts`](../src/common/guards/apijson-auth.guard.spec.ts) | ≥95% | ✅ 完成 |
| APIJSONController | [`apijson.e2e-spec.ts`](../src/test/e2e/apijson.e2e-spec.ts) | ≥80% | ✅ 完成 |

## 快速开始

### 运行测试

```bash
# 运行所有单元测试
npm run test:unit

# 运行所有E2E测试
npm run test:e2e

# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:cov

# 监听模式
npm run test:watch
```

### 查看文档

```bash
# 查看测试策略
cat docs/testing-strategy.md

# 查看使用指南
cat docs/usage-guide.md

# 查看测试培训
cat docs/testing-training.md
```

## 测试工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | ^4.0.16 | 单元测试框架 |
| @vitest/coverage-v8 | ^1.0.0 | 覆盖率工具 |
| Supertest | ^7.1.4 | HTTP测试 |
| @nestjs/testing | ^11.1.11 | NestJS测试工具 |

## 测试辅助工具

项目提供了丰富的测试辅助工具，位于 [`src/test/utils/test-helpers.ts`](../src/test/utils/test-helpers.ts)：

### Mock对象创建器

- `createMockAPIJSONRequest()` - 创建模拟的APIJSON请求
- `createMockParseResult()` - 创建模拟的解析结果
- `createMockVerifyResult()` - 创建模拟的验证结果
- `createMockBuildResult()` - 创建模拟的构建结果
- `createMockExecuteResult()` - 创建模拟的执行结果
- `createMockAPIJSONResponse()` - 创建模拟的APIJSON响应

### 服务Mock工厂

- `createMockConfigService()` - 创建模拟的配置服务
- `createMockJwtService()` - 创建模拟的JWT服务
- `createMockReflector()` - 创建模拟的反射器
- `createMockLogger()` - 创建模拟的日志器
- `createMockCacheService()` - 创建模拟的缓存服务
- `createMockDatabaseService()` - 创建模拟的数据库服务

### 测试数据生成器

- `TestDataGenerator.user()` - 生成用户测试数据
- `TestDataGenerator.product()` - 生成产品测试数据
- `TestDataGenerator.order()` - 生成订单测试数据
- `TestDataGenerator.array()` - 生成测试数据数组

### 工具函数

- `randomString()` - 生成随机字符串
- `randomNumber()` - 生成随机数字
- `randomEmail()` - 生成随机邮箱
- `randomDate()` - 生成随机日期
- `sleep()` - 等待指定时间
- `deepEqual()` - 深度比较对象
- `getObjectDiff()` - 获取对象差异

## 测试覆盖率目标

### 整体覆盖率

- 行覆盖率：≥80%
- 函数覆盖率：≥80%
- 分支覆盖率：≥80%
- 语句覆盖率：≥80%

### 模块覆盖率

| 模块类型 | 覆盖率目标 |
|---------|-----------|
| 核心业务模块 | ≥90% |
| 安全相关模块 | ≥95% |
| 缓存和数据库 | ≥85% |
| 拦截器和控制器 | ≥80% |

## CI/CD集成

项目已配置好GitHub Actions工作流，包括：

- ✅ 多Node.js版本测试
- ✅ 代码检查
- ✅ 单元测试执行
- ✅ 覆盖率报告生成
- ✅ Codecov集成
- ✅ E2E测试执行
- ✅ 项目构建
- ✅ 覆盖率报告上传

## 质量门禁

| 指标 | 阈值 | 说明 |
|------|------|------|
| 单元测试通过率 | 100% | 所有单元测试必须通过 |
| 代码覆盖率 | ≥80% | 整体覆盖率不低于80% |
| 核心模块覆盖率 | ≥90% | 核心模块覆盖率不低于90% |
| 测试执行时间 | ≤5分钟 | 单元测试执行时间不超过5分钟 |

## 测试最佳实践

### 1. 测试独立性

每个测试应该独立运行，不依赖其他测试。

### 2. 测试可重复性

相同输入应产生相同输出。

### 3. 测试快速执行

使用Mock避免慢速操作，确保测试快速执行。

### 4. 测试清晰性

测试名称和断言应该清晰表达意图。

### 5. 测试完整性

测试应该覆盖正常、异常和边界情况。

## 文档维护

### 更新频率

- 测试策略文档：每季度
- 使用指南：随功能更新
- 测试培训文档：随工具链更新

### 贡献指南

如需更新文档，请：

1. Fork项目仓库
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 相关资源

- [APIJSON 官方文档](https://github.com/Tencent/APIJSON)
- [NestJS 官方文档](https://docs.nestjs.com/)
- [Vitest 官方文档](https://vitest.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

## 总结

本测试体系文档为APIJSON NestJS项目提供了：

1. **详尽的测试策略** - 包括架构分析、风险识别、边界条件
2. **完整的使用指南** - 包括快速开始、APIJSON语法、使用示例、最佳实践
3. **全面的培训材料** - 包括测试架构、环境配置、执行规范、最佳实践
4. **高覆盖率的测试代码** - 覆盖所有核心模块
5. **丰富的测试辅助工具** - 简化测试编写
6. **CI/CD集成** - 自动化测试执行和质量检查

遵循本测试体系，可以确保项目的高质量和稳定性。
