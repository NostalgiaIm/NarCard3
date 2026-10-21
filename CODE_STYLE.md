# NarCard3 代码编写与工程规范

## 核心理念

代码首先写给人阅读，其次才是让机器执行。项目追求清晰的排版、可解释的命名和明确的逻辑边界；技术选型服务于可维护性，不为了炫技增加复杂度。

## 工程架构与样式规范

### Astro 与 SCSS 的职责

- Astro 负责页面结构、路由、构建期数据、SEO、RSS 和内容集合。
- 共享设计变量和 Markdown 样式集中放在 `src/styles/`。
- `src/layouts/BaseLayout.astro` 负责引入共享样式入口。
- 新增共享样式优先放入 `src/styles/*.scss`，不要创建重复的页面级 CSS。
- `public/editor.html` 是独立的浏览器编辑器入口，不要为了统计语言占比删除或改造成 Astro 页面。
- `narcard-editor/` 是独立的 Tauri v2 + Rust 子项目，文件系统和桌面能力由 Rust 负责。

### SCSS 组织

- `_tokens.scss`：颜色、字体、边框、阴影和其他设计变量。
- `_mixins.scss`：可复用的玻璃面板、焦点状态和动态效果规则。
- `scss-enhancements.scss`：共享 Markdown 和展示区域的增强样式。
- 组件样式逐步拆分到 `src/styles/`，并通过 `@use` 组合。
- 当前项目保留 `global.css` 作为已有全局样式基线；只有在完成迁移、验证构建和确认引用关系后，才能删除或改名。
- `.astro` 内的已有样式不要批量改写；需要迁移时逐个组件处理，并显式使用 `<style lang="scss">`。

### SCSS 排版

- 所有 CSS 属性独立成行，禁止把多个属性压在同一行。
- 嵌套层级不超过三层；过深结构使用独立类名或扁平化选择器。
- 父级属性和嵌套选择器之间必须留空行。
- 重复颜色、阴影和字体值优先使用 `_tokens.scss` 中的变量。
- 复杂 `@include`、`@each`、媒体查询和伪元素必须用单行注释说明原因。
- 使用 `/* ================= 模块名称 ================= */` 分隔组件、布局和主题模块。

## JavaScript、TypeScript 与 Astro 排版

- 不同函数之间空一行。
- 一组变量定义和后续业务逻辑之间空一行。
- 不同逻辑块之间保持空行，避免代码堆叠。
- 超过三个步骤的链式调用必须拆行并缩进。
- 遇到空值、非法参数或缺少 DOM 元素时优先提前返回，避免深层 `if` 嵌套。
- 简单的单行校验可以省略大括号；包含多步逻辑的条件必须使用清晰的块级缩进。
- 不改变已有稳定功能中的变量名、函数名、API 调用顺序和核心逻辑，除非任务明确要求行为变更。

## 注释规范

### 模块横幅

长文件按功能分块，并在横幅前后保留空行：

```javascript
/* ================= DOM 初始化 ================= */
```

### 函数注释

新增函数必须在上方写一行注释，复杂参数使用 JSDoc：

```javascript
/**
 * 初始化目标元素并渲染列表
 * @param {HTMLElement} element - 目标容器
 */
function initializeList(element) {
  if (!element) return;
}
```

### 解释原因

以下场景必须解释“为什么”：

- 复杂正则表达式的匹配范围；
- 特殊 DOM 选择器或兼容性处理；
- 提前返回和其他防御性逻辑；
- `URL.revokeObjectURL` 等内存清理；
- 事件解绑、重绑或临时监听器；
- 不直观的魔法数字和平台限制。

## AI 协作约束

- 不使用“其余代码保持不变”、省略号或伪代码代替完整实现。
- 生成或修改文件时保留完整文件内容和原有逻辑。
- 不输出一行流压缩代码。
- 纯排版或注释重构不得改变变量名、函数名、API 调用顺序和核心运算规则。
- 修改前先阅读目标文件，修改后运行对应的检查和构建命令。
- 复杂改动先说明范围，再分阶段实施，不把未完成的实验代码混入稳定入口。

## GitHub Linguist 与提交规范

- `.gitattributes` 将 `.astro` 标记为 Astro，将 `.scss` 标记为 SCSS。
- Markdown 文档标记为 documentation，不让文档占用主要语言统计。
- HTML 入口页不作为主要源码统计；这不代表可以删除仍在使用的 HTML 入口。
- `node_modules/`、`dist/`、`.astro/`、Tauri `target/` 和生成目录不得提交。
- `Cargo.lock`、源码、配置、图标和文档应保留。
- 提交前执行：

```powershell
git status --short
git diff --check
```

## 日常验证清单

- [ ] 新逻辑是否放在正确的 Astro frontmatter、组件或 Rust command 中？
- [ ] 新增共享样式是否放入 `src/styles/*.scss`？
- [ ] 是否避免了重复的原生 CSS、无用 HTML 或临时文件？
- [ ] 是否清理了调试日志和废弃代码？
- [ ] 是否运行了 `npm run check` 和 `npm run build`？
- [ ] 如果修改 Tauri，是否运行了 `npm run build`、`cargo test` 和 `cargo check`？
- [ ] 提交前是否确认没有加入 `node_modules/`、`dist/` 或 `target/`？
