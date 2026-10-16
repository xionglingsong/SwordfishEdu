# 通过 Agent 对话批量修改 SwordfishEdu 译文

这一版把 CAT 作为可读写的本地工具：Codex、Claude Code、Hermes 等 Agent 负责理解要求和生成修改，CLI 负责读取、校验、提交和撤销。无需再配置一套模型 API，也没有增加模型费用；使用当前 Agent 本身的模型服务。

## 启动

需要 Node.js、PATH 中可用的 JDK 21+，以及本项目已有的 npm 依赖和内置 Java 运行时。

```bash
cd /Users/lingsongxiong/mydev/SwordfishEdu-master
npm run start:agent
```

该命令先把 Java 后端编译到 `.agent-build/swordfish.jar`，然后启动 Electron。使用 `--upgrade-module-path` 加载新后端，不覆盖原来的运行时或已提交 JAR，也不运行会删除 build 目录的 Gradle dist 任务。

若已有 SwordfishEdu 实例，请先保存并正常退出，再启动 Agent 模式。正常 `npm start` 不启用 Agent 接口。已安装 DMG 中的版本不会因此更新；当前交付的是源码运行模式。

**使用 Agent 时，先保存译文并关闭目标项目的编辑标签，应用本身保持运行。** 第一版对读取、写入、撤销都执行项目占用检查，以免把尚未保存的编辑区内容覆盖掉。后台项目任务也需完成。操作结束后重开项目查看结果。

接口绑定 `127.0.0.1:8070`，不经代理，使用启动时生成的本地令牌，拒绝携带 Origin 的浏览器请求。CLI 自动读取令牌，不要把令牌粘进聊天或版本库。macOS 默认位置是 `~/Library/Application Support/Swordfish/agent-token`（Java 后端目录，和 Electron app.name 目录不同）。环境变量 `SWORDFISH_AGENT_TOKEN_FILE` 与 `SWORDFISH_AGENT_PORT` 仅供隔离测试／自定义实例使用。这并没有把旧的内部 `/projects/*` API 改造成完整的安全公共 API；Agent 只使用新增的 `/agent`。

## 对 Agent 说什么

让 Agent 阅读 `.agents/skills/swordfish-agent/SKILL.md`，然后可以直接说：

> 在项目“用户手册”里，把未确认译文中的“工作空间”统一为“工作区”。结合源文判断，不动产品专名；直接修改，完成后告诉我数量和撤销编号。

> 审阅第三章，把生硬的被动表达改自然一些，保持事实、人名和数字。先给我修改建议，不要写入。

> 应用刚才预览的修改。不要动已确认段，也不要把结果加入翻译记忆库。

> 撤销上一个批次；后面手工修改过的段落不要覆盖。

这个工作流发生在外部 Agent 的聊天中。应用现有 AI Tutor 仍然是原来的功能；本次没有把完整 Agent 嵌入 AI Tutor，也没有实现打开编辑标签时的实时双向编辑。

## 命令

在仓库根目录运行。直接 `node` 输出纯 JSON，更适合 Agent；`npm run agent -- …` 也可用。

```bash
node scripts/swordfish-agent.mjs --help
node scripts/swordfish-agent.mjs projects
node scripts/swordfish-agent.mjs read PROJECT_ID 0 100
node scripts/swordfish-agent.mjs validate /tmp/swordfish-patch.json
node scripts/swordfish-agent.mjs apply /tmp/swordfish-patch.json
node scripts/swordfish-agent.mjs history PROJECT_ID
node scripts/swordfish-agent.mjs undo PROJECT_ID BATCH_ID
```

`read` 返回 srcLang/tgtLang、segments、hasMore、nextOffset。每段包含 file/unit/segment、原始 source/target XML、state、translate（Y/N）和 revision。分页上限 500；原始顺序用于理解上下文。版本指纹覆盖源文、译文、状态与锁定标记，不是可自行填写的编号。

补丁结构（占位字段必须来自真实 read 结果）：

```json
{
  "project": "PROJECT_ID",
  "instruction": "统一工作区术语，保持其他内容",
  "includeConfirmed": false,
  "edits": [
    {
      "file": "FILE_ID",
      "unit": "UNIT_ID",
      "segment": "SEGMENT_ID",
      "revision": "从 read 返回值原样复制",
      "target": "<target>请打开工作区。</target>",
      "reason": "术语统一"
    }
  ]
}
```

`validate` 返回真实 before/after，不提交译文或修改历史。`apply` 会重新校验，不依赖先前预检结果。每批 1–200 条；重复段、锁定段、过期 revision、空目标、XML 错误或标签变动会让整批失败。相同译文按无变化跳过。

修改后的状态为 translated（待人工确认），不自动传播、不写入 TM。默认拒绝 final 段；用户明确包含这些段时才设置 includeConfirmed。现有目标有标签时以现有目标结构为准，否则以源文标签结构为准；这是保守的文本修改接口，不支持标签重排、修标签或改分段。

每批修改和 before/after 历史记录一起提交到项目数据库。历史最近 100 条可查询；较早批次有 ID 时仍可撤销。`undo` 核对该批修改后的版本，恢复旧译文和旧状态，并生成新的历史批次；若任一段后来被编辑或锁定，整批撤销拒绝。记录随项目一起删除；不是独立灾难备份。界面 Cmd+Z 不包含这些外部批次，应使用 CLI undo。

CLI 失败返回非零退出码和 JSON 错误。网络中断可能发生在提交之后：先读 history/当前段落，不能直接重试。多个批次不构成跨批事务。

## 验证

```bash
npm run build
npm run test:agent
```

测试在临时项目与临时用户目录运行，不使用真实译文。覆盖 SQLite 原子写入／回滚、Unicode、实体、标签、锁定、确认状态、版本冲突、历史、撤销，以及内置 Java 运行时 + HTTP + CLI 的端到端流程。

## 从参考截图中选择后续功能

| 参考功能 | 本库情况／建议 |
|---|---|
| 双语编辑、TM、术语、机翻、AI 对话 | 已有，优先复用；无需照搬参考软件界面 |
| 多步术语提取 → 翻译 → 核查 → 入库 | 适合下一阶段；先做候选与人工核准，避免未审译名污染术语库 |
| 批量 AI 润色与审校 | 本次打通外部 Agent 工作流；后续可加应用内 diff、范围选择和逐条采纳 |
| 项目模板／统一翻译要求 | 可把受众、术语、禁用译法、风格要求作为 Agent 上下文，需单独设计保存方式 |
| TM／术语库远程访问 | 代码已有 RemoteTM 功能；截图的 TMX URL 拉取不等同于实时协作，不直接重复建设 |
| 分析、伪翻译、批量 TM 应用 | 已有入口，后续逐项实测再决定扩展 |
| 对齐工具与批量提取术语 | 作为独立增量评估，不在本次宣称完成 |
| SDL／memoQ／Transit／GLP 全格式返回包 | 截图仅证明有按钮；应逐格式用真实样例测试导入、导出和原软件回读 |

优先顺序建议：当前 Agent 链路 → 应用内修改预览与实时同步 → 项目级术语／风格上下文 → 批量术语工作流 → 更多格式兼容性验证。

## 内置风格指南

已内置十种配置的 CAT 适用摘要（不是全文镜像），无需联网加载：

| ID | 来源 | 主要口径 |
|---|---|---|
| `ruanyf` | 阮一峰《中文技术文档的写作规范》 | 正式、简洁；中文与数字的空格可选但统一，说明括号用全角 |
| `yikeke` | 《中文技术文档写作风格指南》 | 用户导向、对话式；中文与数字一般留空格，纯英文括号内容用半角 |
| `microsoft` | Microsoft 在线指南 | 通用英文，sentence case、牛津逗号 |
| `microsoft-en-gb` | 微软英式英语 PDF | 英式拼写，普通列举不加牛津逗号 |
| `microsoft-zh-cn-doc` | 微软简体中文 PDF：文档 | 正文全角冒号、问号；按内容选择括号 |
| `microsoft-zh-cn-ui` | 微软简体中文 PDF：软件界面 | 半角冒号、问号、叹号和圆括号 |
| `google` | Google 开发者指南 | 美式英文，条件在前、操作在后，牛津逗号 |
| `apple` | Apple Style Guide，June 2026 | 美式英文；精确的产品／操作术语，标题大小写按项目选择 |
| `redhat` | Red Hat Technical Writing，Stylepedia v7.2 | 培训／认证等内容，title case，避免缩约 |
| `redhat-product` | Red Hat 产品文档补充指南 | sentence case，前提条件与操作分开，按内容决定缩约 |

```bash
node scripts/swordfish-agent.mjs styles
node scripts/swordfish-agent.mjs style ruanyf
node scripts/swordfish-agent.mjs style yikeke
```

`style` 返回规则、来源、版本及可供 Agent 使用的 prompt。读取指南不要求 CAT 运行。指定一份主指南，避免把有差异的规则机械合并。

可以对 Agent 说：“按阮一峰指南审阅用户手册的未确认中文译文，先给我修改建议。” 或：“使用 yikeke 指南，把第二章改成清晰、用户导向的说明，直接修改，保持项目术语。”

补丁顶层可以增加 `"styleGuide": "ruanyf"`。通过 CLI 提交时，该 ID 与摘要版本会写入批次 instruction；每段 reason 建议包含规则 ID。`validate` 不会判断语言是否符合指南，不是风格检查器；它校验的是标签、版本和修改条件。CLI 不会自己生成译文，Agent 需要先读取规则。

应用内 **AI 助手** 也新增了“风格指南”选择器和“风格审校”按钮。选择会在本机记忆，影响后续 AI 对话的系统提示；切换时清空旧对话，避免沿用另一指南。它不会自动修改译文、替换术语或改变评分标准。内置助手仍使用应用中已配置的模型。

规则来源、许可证、摘要改编说明见 `style-guides/README.md`。根据 scope、targetLocales 和 contentType 选择配置；文档层级、首次出现等需结合上下文，不对每个 CAT 段机械应用。

新增调用示例：

```bash
node scripts/swordfish-agent.mjs style microsoft
node scripts/swordfish-agent.mjs style microsoft-en-gb
node scripts/swordfish-agent.mjs style microsoft-zh-cn-doc
node scripts/swordfish-agent.mjs style microsoft-zh-cn-ui
node scripts/swordfish-agent.mjs style google
```

对 Agent 说：“按微软 en-GB 指南审阅英译文，保留产品名与代码，先给修改建议。”或“按 Google 指南修改这份美式英文 API 文档，保持参数名与技术含义。”中文可说“使用微软简体中文 UI 配置审校按钮和错误消息，不套用正文标点”。

Apple 配置可用 `node scripts/swordfish-agent.mjs style apple` 离线读取。在 AI 助手选择“Apple · Style Guide（美式英文）”，或对 Agent 说：“按 Apple 指南审阅这份英文 Mac 用户手册，保留产品名、旧版界面标签和快捷键，先给建议。”

Apple 摘要依据 244 页的 June 2026 PDF，保留来源页码。网页路径含 zh-cn，但指南声明基于美式英语，不作为中文标点或英式拼写规范。标题大小写不是统一 sentence case；按部门／项目要求选择。日期的 International style 仅在项目采用时启用。

Red Hat 配置分别用 `style redhat` 与 `style redhat-product` 调用。例如：“按 Red Hat 产品文档补充指南审阅这份 OpenShift 英文操作文档，不更改命令、参数和前提条件；先给建议。”培训材料可指定“按 Stylepedia 的 Red Hat Technical Writing 指南处理”。

二者用途不同，不自动合并。产品文档原体系为项目规则 > 补充指南 > IBM Style；此实现仅提供已核对的补充规则摘要，不提供 IBM Style 全文。标题从 -ing 改成祈使式需确认已经完成 Jobs to Be Done 结构转换。
