# SwordfishEdu

翻译教学与练习平台，基于 [Swordfish](https://github.com/maxprograms-com/Swordfish) CAT 工具构建，面向翻译学习者提供结构化的练习、AI 智能评分与诊断反馈。

---

## 核心功能

### 翻译练习系统

| 功能 | 说明 |
|------|------|
| CSV 导入 | 导入双语 CSV 文件（原文/译文两列）作为练习 |
| 剪贴板导入 | 粘贴双语文本，自动解析为段落对 |
| 网页导入 | 从分页 URL 抓取双语内容（支持页码范围、进度预览） |
| 练习管理 | 表格视图：名称、语言对、段落数、词数、最近得分、历史记录 |
| CATTI 倒计时 | 面板显示考试倒计时、累计练习词数、各练习详情 |
| 练习历史 | 每次评分自动存档，可随时回看任意历史评分报告 |

### AI 智能评分

采用 **ATA 错误分类标准** + **CATTI 扣分制** 双框架：

**三维评分（总分 100）**

| 维度 | 满分 | ATA 板块 | 评价内容 |
|------|------|----------|----------|
| 意义传递 / Meaning Transfer | 40 | Section 2 | 忠实原文、无错译漏译 |
| 译入语规范 / Target Mechanics | 30 | Section 1 | 语法正确、语言规范 |
| 行文质量 / Writing Quality | 30 | Section 3 | 用词恰当、体现原文风格 |

**错误分类（17 种 ATA 类型）**

- **Section 1 — 译入语规范**: G(语法)、SYN(句法)、WF/PS(词形/词性)、SP/CH(拼写/字形)、P(标点) 等
- **Section 2 — 意义传递**: A(增译)、O(漏译)、T(术语误用)、FA(假朋友)、MU(误解)、COH(衔接不当)、L(死译) 等
- **Section 3 — 行文质量**: U(搭配/用法)、TT(文本类型)、R(语域)、ST(风格)、Emphasis(未突出重点) 等

**ATA Flowchart 决策逻辑**

每个错误按四步决策树判定：
1. 是否影响意义？→ 归入 Section 1 或 Section 2
2. 影响范围：局部 / 衔接 / 核心 → 决定严重度
3. 翻译指令与语境考量
4. Section 3 判定：不违反规则但"听起来不对"

**中译英专项评分 (IEGS)**

当目标语言为英文时，自动加载 ATA Into-English Grading Standards 2025，覆盖：
- 冠词用法（中文无冠词，最常见错误源）
- 动词时态（中文无时态变化）
- 逗号与标点（中英文规则差异极大）
- 主谓一致、关系代词、虚拟语气、平行结构、连字符、大小写等

**质量加分**

最多 3 处"出色翻译"亮点，每处 +1 分抵扣错误分。

**支持的 LLM 引擎**

ChatGPT (OpenAI)、Claude (Anthropic)、Mistral、Gemini (Google)、Qwen (通义千问)、GLM (智谱)、Doubao (豆包)

### 评分报告

**总览区**

- 大分数 + 级别徽章（三级/二级/一级）+ 扣分/加分信息
- **核心诊断**：1-2 句话直指最大问题模式及占比
- 三维进度条（含各维度扣分明细）
- 亮点徽章
- 逐行总评分析

**分段详情**

- 每段三维分数条（满分按段落权重分配）
- 学生译文（带波浪线错误标记，颜色区分严重度）
- 原文 + 官方参考译文
- 替代译法（可折叠，标注语域/句式特点）
- 逐词 Diff 对比
- **错误卡片**：
  - ATA 板块标签（意义传递/译入语规范/行文质量）
  - 错误类型 + ATA 代码
  - 扣分值 + 严重度（Minor/Moderate/Serious/Critical）
  - 影响范围（局部/衔接/核心）
  - 重复标记 + 同模式错误分组
  - 修正建议（~~原文~~ → **建议**）
- 亮点加分卡片
- 优点/问题标签
- AI 分析（Markdown 渲染）
- 学生反思区（自动保存）

**导出功能**

| 格式 | 说明 |
|------|------|
| Markdown | 完整结构化报告，含总分、诊断、分项、每段详情、建议 |
| PDF | A4 格式，保留背景色，自动展开所有段落，隐藏交互控件 |

**缩放控制**

- A-/A+ 按钮，范围 70%–150%
- 键盘快捷键：`Cmd/Ctrl + +/-` 调整，`Cmd/Ctrl + 0` 重置
- 状态跨重渲染保持

---

## 专业 CAT 功能

| 功能 | 说明 |
|------|------|
| XLIFF 编辑器 | 基于 XLIFF 1.2/2.0/2.1/2.2 的统一翻译环境 |
| 翻译记忆 (TM) | SQLite 存储、模糊匹配 (NGrams)、TMX/SDLTM 导入导出、一致性搜索 |
| 术语管理 | TBX/TMX 导入、术语识别、术语搜索 |
| 机器翻译 | 7 种 LLM 引擎 + AI 助手对话面板（流式输出） |
| 包工作流 | Trados 兼容返回包 |
| QA 检查 | 可配置的质量检查框架 |

**支持 37 种文件格式**

`inx` `icml` `idml` `ditamap` `dita` `xml` `html` `htm` `js` `properties` `json` `mif` `docx` `xlsx` `pptx` `sxw` `sxc` `sxi` `sxd` `odt` `ods` `odp` `odg` `txt` `po` `pot` `rc` `resx` `sdlxliff` `srt` `svg` `sdlppx` `ts` `txml` `vsdx` `xlf` `xliff` `mqxliff` `txlf`

---

## 安装

下载安装包（推荐）：

- <https://maxprograms.com/products/swfishdownload.html>

---

## 从源码构建

### 环境要求

- JDK 21+ (<https://adoptium.net/>)
- Gradle 9.2.1+ (<https://gradle.org>)
- Node.js 24.11.1 LTS+ (<https://nodejs.org/>)

### 构建步骤

```bash
git clone https://github.com/maxprograms-com/Swordfish.git
cd Swordfish
gradle
npm install
npm start
```

后续启动：

```bash
npm start
```

---

## 技术架构

```
SwordfishEdu
├── src/                    # Java 后端 (Gradle): XLIFF 解析、TM、文件格式转换
├── ts/                     # TypeScript 前端 (Electron)
│   ├── Swordfish.ts        # 主进程: IPC、评分引擎、导出
│   ├── scoreReport.ts      # 评分报告渲染
│   ├── trainingView.ts     # 练习管理视图
│   ├── translation.ts      # 翻译编辑器
│   └── ...                 # 其他功能模块
├── html/                   # HTML 模板 + CSS
│   └── en/
│       └── scoreReport.html
└── css/                    # 主题样式
```

**数据流**:

1. 学生提交翻译 → `scoreTranslation()` 构建评分 Prompt
2. LLM 返回 v2 JSON → `handleScoringResponse()` 解析标准化
3. 存入历史 → `showScoreReport()` 打开报告窗口
4. `scoreReport.ts` 渲染交互式报告 → 支持导出 Markdown / PDF

---

## 视频教程

- 从源码构建: <https://youtu.be/xiHFxfqCleQ>
- AI Prompt 翻译: <https://youtu.be/8S420n2QieM>
- AI 菜单/快捷键翻译: <https://youtu.be/FwsFZCjUajU>

---

## 许可与支持

源代码可免费下载、编译、修改和使用。

订阅版包含：安装包、技术支持、Bug 修复、功能请求。评估密钥可免费试用 30 天。

技术支持：[tech@maxprograms.com](mailto:tech@maxprograms.com)

许可证信息见 [licenses](./licenses) 目录。

---

## 相关项目

- [RemoteTM](https://github.com/rmraya/RemoteTM) — 远程翻译记忆服务器
- [OpenXLIFF](https://github.com/rmraya/OpenXLIFF) — XLIFF 过滤器
