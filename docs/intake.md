# Agent 接单建项（一期）

Projects 工具栏 → **接单建项**。保存客户与委托，选择原文和参考资料，解析、核对计费口径，计算报价。需求确认后创建 CAT 项目。已确认报价产生应收，收款支持分次登记。

源码启动：`npm run start:agent`（JDK 25）。修改已编译后重启应用。界面也可使用常规启动，但 Java 运行时必须包含新后端。

## 从对话或截图开始

外部 Agent 读取 `.agents/skills/swordfish-intake/SKILL.md`，用户发送客户聊天、截图及本地文件。Agent 解释材料并保存结构化草稿，集中询问缺失的币种、计费单位、地区语言、截止时间等信息。应用自身不自动 OCR，也不自动把截图发送到额外的模型服务。

字段依据建议格式：`{"field":"deadline","source":"截图绝对路径或消息标识","text":"周五下午五点","status":"explicit|inferred|confirmed|conflict"}`。未确认问题放在 questions 数组；materials 记录原材料路径与说明。保存时保留这些字段，原始聊天不放入 brief。

## CLI

`node scripts/swordfish-agent.mjs business /absolute/request.json` 返回 JSON。
`node scripts/swordfish-agent.mjs brief PROJECT_ID` 返回筛选后的简报。
文件和金额不要拼接为 shell 字符串，使用 JSON 序列化。

### 客户与委托

```json
{"op":"client-save","client":{"name":"客户公司","contact":"联系人","email":"","phone":"","paymentTerms":"交付后30天"}}
```

先用 `{"op":"list"}` 查重并选已有客户；修改客户需要带 id 和 revision。

```json
{
  "op":"save",
  "intake":{
    "name":"用户手册中译英",
    "clientId":"由客户记录取得的真实ID",
    "srcLang":"zh-CN","tgtLang":"en-GB",
    "deadline":"2026-10-23T17:00:00+08:00",
    "orderNumber":"","service":"翻译","paymentTerms":"交付后30天",
    "files":[{"path":"/absolute/manual.docx","role":"source","encoding":"UTF-8"}],
    "brief":{"purpose":"用户手册","audience":"普通读者","domain":"软件","tone":"清晰克制","styleGuide":"microsoft-en-gb","terminology":"使用客户指定术语","doNotTranslate":"产品名","delivery":"保留排版","instructions":"","aiPolicy":"allowed"},
    "evidence":[],"materials":[],"questions":["按原文字符还是中文汉字计费？"],
    "requirementsConfirmed":false
  }
}
```

更新用相同 id 和最新 revision。可只发送需要更新的字段，数组和 brief 整体替换。客户端的版本过期会拒绝。`get`：`{"op":"get","id":"..."}`。

文件或语言变化使分析失效、报价作废。已建项的文件/语言冻结，新增原文应新建委托。收款后不得替换分析或已确认报价；暂不提供冲销、退款和变更单，不能删除旧收款来绕过账务限制。

### 分析、报价、确认、创建

以下操作均带最新委托 id、revision：

```json
{"op":"analyze","id":"...","revision":1}
```

文件复制到本地分析快照，保存 SHA-256、解析后的 XLIFF 和 skeleton。只统计 source 角色；reference 仅保存快照。解析失败不会生成新的有效分析。文件上限 100 MB；同内容重复文件拒绝计费。首期支持转换器可识别的原文格式及 TXT，现有双语包请使用原有导入流程。未配置 OCR；不声称提取图片或所有隐藏文本。

三种口径：`words` 为 OpenXLIFF CAT 词数；`characters` 为非空白 Unicode code points（含标点、数字、英文）；`han` 为 Unicode Han 字符数。全部重复段与锁定段均计入，不自动打折。计数不等于 Word 统计；需要人工确认是否符合合同。

```json
{"op":"quote","id":"...","revision":2,"pricing":{"basis":"characters","currency":"CNY","rate":"180.00","per":1000,"rounding":"exact","minimum":"0","surcharge":"0","discount":"0","countConfirmed":true}}
```

basis 也支持 words、han、fixed。per 为 1 或 1000；fixed 始终为项目总价。rounding 可选 exact 或 ceil-block。先算基础价，再取最低收费，最后加附加费减折扣。金额是十进制字符串，最多两位小数；支持 CNY/USD/EUR/GBP/HKD/AUD/CAD，暂不处理税率、汇率、小时或页计费。

计算只产生 estimate。客户实际接受后：

```json
{"op":"confirm-quote","id":"...","revision":3,"quoteId":"真实报价ID"}
```

分析完成后用 save 将 requirementsConfirmed 设为 true，并清空已解决的 questions。此确认涉及委托事实，不要求先确认报价才能建项。

```json
{"op":"create","id":"...","revision":5}
```

返回 projectId。重复请求同一委托返回同一项目，不生成重复项目。原文件取自已核对的快照，不受用户后来覆盖下载文件影响。创建后去 Projects 刷新，正常翻译／导出。首期新项目默认不绑定 TM 或术语库，在现有项目设置中选择，brief 里的术语要求不等于已经导入 TBX。

### 收款

```json
{"op":"payment","id":"...","revision":6,"payment":{"id":"本次付款的UUID","amount":"500.00","currency":"CNY","date":"2026-10-16","note":"定金"}}
```

同一付款 ID 和相同内容重试不会重复入账。金额不能超过未收余额，币种必须与确认报价一致。失败／超时后先 get 核对，不能换一个 ID 盲目重试。应收依据已确认报价，估算不算应收。所有报价和支付记录保留于委托，未实现发票或税务账簿。

## AI 简报与限制

Brief 白名单：purpose/audience/domain/tone/terminology/doNotTranslate/delivery/styleGuide/aiPolicy/instructions，加语言对和版本。不包含客户、联系方式、报价、收款或聊天材料。Agent `read` 附带 translationBrief；AI Tutor 自动读取项目 brief，并优先采用委托风格。

aiPolicy 为 allowed、local-only 或 forbidden。首期对后两种，在 AI Tutor、机翻和评分的外部入口阻断；Agent read 也拒绝返回正文。并未实现自动配置受信任的本地模型通道。`brief` 仍可读取限制，帮助 Agent 解释停止原因。不要把 local-only 当作“自动已使用本地模型”。

Brief 当前完整接入外部 Agent 与 AI Tutor。旧的批量 MT 引擎受 AI 权限保护，但不保证接收完整自然语言 brief；需要严格使用 brief 的批量翻译请使用 Agent，不要把 brief 拼到原文冒充正文。风格不变更 ATA/CATTI 的评分体系。

业务数据位于 Java 后端工作目录 `business/data.json`，分析文件在 `business/analysis/`。需要与项目文件一起备份；本地保存不等于加密。删除 CAT 项目不会删除账务记录，再次 create 会提示关联项目已删除。

## 验证与已知边界

`npm run test:agent` 包含 24 项业务检查及 TXT/DOCX 建项后导出验证。界面烟测：`env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron tests/intake-ui-smoke.mjs`，使用临时数据目录和真实后端，不调用模型。

此版本尚未包含自动发票、退款冲销、TM 匹配折扣、客户默认价模板或原生截图 OCR。单次解析同步执行，超过 CLI 超时后先 get 核对是否完成，不能直接重复建项。来源附件引用不会自动变成图片内容，须由 Agent 读取用户原始材料。
