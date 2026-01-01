# JS/TS 编码规范
## 1. 命名规范
- 变量/函数：小驼峰（camelCase）
- 常量：大驼峰+下划线（UPPER_CASE）
- 组件：大驼峰（PascalCase）
## 2. 语法规范
- 优先使用 ES6+ 语法（let/const 替代 var，箭头函数替代普通函数）
- 异步操作优先使用 async/await，禁止回调嵌套
- 代码结尾必须加分号
- 单个函数代码行数不超过 50 行
## 3. 架构规范
- Vue 组件按“template→script→style”顺序编写
- script 部分按“import→props→emits→setup→methods”顺序组织
