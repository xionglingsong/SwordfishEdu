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

## 商务工作台 A 期：应收、实收、交付

Projects 的入口现在叫 **商务工作台**。默认展示应收与实收看板，可切回新建或已有委托。客户档案增加 company（单位）、wechat（微信）、taxId（税号），选择客户后“编辑当前客户”，新增客户用“新客户”。客户修改需要最新 revision，改名查重，不将两位同名客户自动合并。委托增加 endClient（终端客户），不自动替代付款客户。

看板按客户 ID + 币种分组，展示合同总额、未收余额、未交付待收、已交付未收、交付状态待确认余额、逾期未收、付款日待确认余额和所选期间实收。合同等余额按当前账本全量统计，日期范围只影响“期间实收”，按支付记录 date 过滤（两端包含），不按订单创建日或交付日过滤。各币种独立，未换汇。

```json
{"op":"finance","from":"2026-10-01","to":"2026-10-31","timeZone":"Asia/Shanghai"}
```

省略日期时默认为所选时区本月1日至今天。asOf 为所选统计时区的今天；日期均按日处理，无时分秒利息计算。显示未到期、今日到期、逾期 N 天、账期待确认。逾期以 paymentDueDate 为准，不用 deadline 或 deliveredDate 顶替；旧记录不猜测日期或交付状态。此为合同余额管理口径，不等同于法定会计应收确认。

### 交付状态与收款状态独立

```json
{"op":"delivery","id":"委托ID","revision":7,"deliveryStatus":"delivered","deliveredDate":"2026-10-16","paymentDueDate":"2026-11-15","timeZone":"Asia/Shanghai"}
```

交付状态：unknown / not-started / in-progress / delivered。旧记录默认 unknown，不自动认定已交付；已交付必须有真实日期且不能在业务时区的未来。回退为未开始或进行中时显式清空 deliveredDate。到期日允许早于交付日（例如合同约定先付定金），未知留空。此版本只支持一个订单到期日，分期到期日后续实现。

这些变更写入 deliveryHistory，保留前后值和操作时间。不会重置翻译需求确认，也不会向翻译 brief 添加税号、微信或财务状态。timeZone 在订单中保存为 businessTimeZone；看板以用户选择的统一统计时区计算 asOf，不按每个客户分别换日。

收款状态由 confirmed quote 和 payments 自动推导：unquoted（无确认报价）、unpaid、partial、paid；不得手工用交付状态替代收款事实。满额预付仍可保持进行中。当前仍不接受超过未收余额的付款；跨订单分配、超额预收、冲销退款等属于下一阶段。

## B 期：服务订单、报价参考和工时

### 无需 CAT 文件的服务订单

新建时选择 `orderKind: "service"`；原有记录默认 `cat`。服务订单要求名称、客户、服务类型和含时区的交期，不要求原文文件、语言对或翻译 AI 权限。确认前需解决 questions 并设置 requirementsConfirmed。使用 `confirm-order`，不会生成 CAT 项目；CAT 仍用 `create`。

```json
{"op":"save","intake":{"orderKind":"service","name":"两小时口译","clientId":"真实客户ID","service":"口译","deadline":"2026-10-23T17:00:00+08:00","requirementsConfirmed":true,"questions":[]}}
```

```json
{"op":"quote","id":"委托ID","revision":1,"pricing":{"basis":"hours","quantity":"2.5","currency":"CNY","rate":"180.00","per":1,"rounding":"exact","countConfirmed":true}}
```

手工数量最多三位小数，可选 hours/pages/minutes/items，以及手工确认的 words/characters/han；fixed 为总价，不使用数量。该数量在报价中标记 manual-confirmed，不声称来源于文件分析。CAT 只允许文件统计口径及总价。服务订单确认：`{"op":"confirm-order","id":"...","revision":3}`。确认报价仍独立使用 confirm-quote。

订单确认、CAT 项目创建或确认报价后，不能改变订单类型、付款客户或服务范围；新增业务应新建委托。独立服务的手工附件当前不执行 OCR 或解析计数。跨项目付款、预收分配、退款尚未加入。

### 报价参考模板

界面“维护报价参考模板”支持新增、编辑。模板可限定客户、服务名称和有效日期；Agent 接口还可限定 srcLang/tgtLang。选择模板后下方显示模板价；计算使用后端模板内容，如需单次议价先切回手工填写。模板只是候选，不自动代表客户接受。

```json
{"op":"rate-save","rate":{"name":"客户A口译参考价","clientId":"真实客户ID","service":"口译","validFrom":"2026-01-01","validTo":"2026-12-31","pricing":{"basis":"hours","currency":"CNY","rate":"180.00","per":1,"rounding":"exact","minimum":"0","surcharge":"0","discount":"0"}}}
```

更新模板带 id/revision；`rate-list` 列出模板。`active:false` 可停用。使用模板报价：

```json
{"op":"quote","id":"委托ID","revision":2,"rateId":"真实模板ID","pricing":{"quantity":"2.5","countConfirmed":true}}
```

后端验证客户、服务、语言和有效期，整份模板保存为 rateSnapshot。模板变化不追溯修改已有报价。现阶段不支持一份报价中多行服务，按订单分别报价。

### 工时和时薪

```json
{"op":"time-add","id":"委托ID","revision":4,"entry":{"id":"本次工时UUID","date":"2026-10-16","minutes":150,"activity":"口译","note":"含准备工作"}}
```

一条工时为 1–1440 整数分钟，日期不能在业务时区的未来。同 ID 相同内容重试不重复入账。错误工时使用 `time-void`：

```json
{"op":"time-void","id":"委托ID","revision":5,"entryId":"工时UUID","reason":"重复登记"}
```

原记录保留 voidedAt/voidReason，不物理删除。work 返回有效分钟、小时数、合同额时薪和实收时薪，零工时或无确认报价时为 null。它们不扣除成本，不应称为净利润时薪；工时不自动改变合同计费数量。

### A 期复查修复

切换委托时重置/恢复该单自己的报价输入，避免沿用别单价格；后端明确拒绝的收款可修正金额后重试，网络结果不明仍要求保留原请求。刷新会重新读取当前委托版本；有未保存改动时提醒。禁止在已有确认报价后偷偷换付款客户，避免历史款项被归给另一客户。
