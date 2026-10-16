# 内置技术写作与本地化风格指南

本目录提供针对 CAT 译文编辑整理的规则摘要。`catalog.json` 是 AI 助手和 Agent CLI 的共同数据来源；`runtime.mjs` 根据单个指南生成提示词。目录版本 1.3.0（各指南独立版本，现均为 1.0.0），资料核对日期 2026-10-16。

## 来源与许可证

- `ruanyf`：阮一峰及贡献者，[中文技术文档的写作规范](https://github.com/ruanyf/document-style-guide)。上游 README 声明为公共领域 (public domain)。参考文本、数值、标点、段落、标题章节。
- `yikeke`：Keke Yi 及贡献者，[中文技术文档写作风格指南](https://zh-style-guide.readthedocs.io/zh-cn/latest/)，[源码仓库](https://github.com/yikeke/zh-style-guide)。使用 MIT 许可，完整声明保留于 [LICENSE-yikeke.txt](LICENSE-yikeke.txt)。参考对话式、客观礼貌、简洁清晰、用词恰当、空白符号、中英文混用标点和名称使用章节。

每条规则均包含来源链接。本摘要不代表原作者认可 SwordfishEdu，也不覆盖原指南的全部内容。无需联网调用，更新上游不会自动改变既有规则。

## 改编与边界

规则经过压缩和 CAT 适配：增加源文忠实度、代码／标签保护、上下文限制。原指南的句长和段落行数要求不作为自动删除内容的硬阈值；千分位规则不应用于年份、代码、编号或版本号；“首次出现”不能按每个分段重新计算。这些适配不是原指南原文。

两份指南分开选择：ruanyf 允许中文与数字之间有或无空格但保持一致，yikeke 一般要求留空格；ruanyf 的中文补充说明采用全角括号，yikeke 建议纯英文括号内容用半角括号；前者偏正式，后者推荐对话式。

默认不选择指南。用户明确要求或项目术语优先于风格偏好，但不能改变源文事实、数字、条件、占位符或标签结构。不确定是否可以改写时应给出建议。此功能向模型提供规则，不保证模型完全遵从，也不是独立的确定性风格检查器。

## 扩展

在 catalog.json 的 guides 中增加具有唯一 id 的条目，保留 name、description、source、author、license、rules（每条包含 id/category/instruction/source）。核对来源和许可证，增加必要声明，再调整摘要版本并执行 `npm run test:styles` 与 `npm run build`。AI 助手和 CLI 会使用同一份新目录，无需复制提示词到多个代码文件。

## 微软与 Google 配置

| ID | 来源与适用范围 |
|---|---|
| microsoft | Microsoft Writing Style Guide 在线版，英文一般口径 |
| microsoft-en-gb | 用户提供的 English (UK) Localization Style Guide，46 页，英式英语 |
| microsoft-zh-cn-doc | 用户提供的 Chinese (Simplified) Localization Style Guide，58 页，文档模式 |
| microsoft-zh-cn-ui | 同一简体中文 PDF，软件界面模式 |
| google | Google developer documentation style guide，美式英文开发者文档 |

微软在线来源：[Welcome](https://learn.microsoft.com/en-us/style-guide/welcome/)、[Top 10 tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice)。作者 Microsoft，源文版权归 Microsoft；在线文档仓库的 [LICENSE](https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE) 为 CC BY 4.0。

Google 来源：[About](https://developers.google.com/style/)、[Highlights](https://developers.google.com/style/highlights)、[Voice and tone](https://developers.google.com/style/tone)。作者 Google，页面内容除另有注明外使用 CC BY 4.0。未复制代码示例。

上述在线内容经中文转述、压缩并添加 CAT 结构保护限制，非官方原文或全文镜像。遵循 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，许可全文见 [LICENSE-CC-BY-4.0.txt](LICENSE-CC-BY-4.0.txt)。不表示 Microsoft 或 Google 认可本软件。

本地 PDF 文件名为 eng-gbr-StyleGuide.pdf 与 zho-chn-StyleGuide.pdf，PDF 元数据修改日期均为 2024-09-05（不等同于官方版本号）。来源记录包含文件 SHA-256、页数，各条规则标明 PDF 页码。未把在线文档的 CC 许可推定适用于 PDF；PDF 本体没有加入仓库或安装包，仅包含自写的规则摘要。调用摘要不依赖 Downloads 路径或原 PDF 继续存在。

### 不能混用的规则

- 微软 en-GB：普通列举最后 and/or 前不加牛津逗号；微软在线英文及 Google：三项及以上列举加牛津逗号。
- Google：标准美式拼写；微软 en-GB：英式拼写，不能修改代码标识符和品牌名。
- 微软中文文档：全角冒号、问号；软件界面：半角冒号、问号及叹号，空格按具体规则处理。
- 微软中文 PDF 有专门的省略号等约定，不等同于通用中文指南。适用时以所选配置为准。

每份配置的 scope、targetLocales 和 contentType 会进入模型提示词。范围判断由 Agent/模型执行，并非程序强制的语言检测。用户明确要求组合时需要约定冲突优先级；默认仅选择一份。

## Apple 配置

`apple`：Apple · Style Guide（美式英文）。依据用户提供的 apple-style-guide.pdf，封面版本 **June 2026**，共 244 页；PDF 修改时间 2026-06-16。每条摘要标记 PDF 页码，来源记录保留 SHA-256。

- [在线 About the guide](https://support.apple.com/zh-cn/guide/applestyleguide/apsg1eef9171/1.0/web/1.0)
- [官方 PDF 下载入口](https://help.apple.com/pdf/applestyleguide/en_US/apple-style-guide.pdf)
- 作者及版权：Apple Inc.，Copyright © 2026 Apple Inc. All rights reserved（本地 PDF 第 244 页）。

内容为自行转述并适配 CAT 的规则摘要，非原文镜像；未复制原 PDF，也未将其他来源的 CC 或 MIT 许可用于 Apple 内容。不表示 Apple 官方认可。离线摘要不依赖 Downloads 中的源文件继续存在。

适用范围是美式英文 Apple 技术文档、参考资料与面向用户的文字，网址的 zh-cn 不代表中文本地化指南；也不等同于 UI 设计的 Human Interface Guidelines。

Apple 同时允许 sentence-style 和 title-style，按部门／项目规范选择；不要套用 Google 的统一 sentence case。click、tap、press 对应不同动作，需明确设备及操作；Apple Account 的新术语不应覆盖旧版 UI 引文或指代邮箱的 Apple ID。正文日期与 International style 日期是条件性规则，不全局混用。摘要不覆盖 244 页全文中的全部术语条目。

## Red Hat：两套独立用途

- `redhat`：[Red Hat Technical Writing Style Guide v7.2](https://stylepedia.net/style/)。[首页](https://stylepedia.net/)明确其适用于培训、认证及其他非产品文档技术内容。标题使用 title case，避免缩约。
- `redhat-product`：[Red Hat supplementary style guide for product documentation](https://redhat-documentation.github.io/supplementary-style-guide/#introduction)。用于产品与跨产品方案文档，标题使用 sentence case；一般避免缩约，较口语内容有例外。产品项目规范优先，其次补充指南，再参考 IBM Style。本实现不包含 IBM Style 全文。

二者不是简单的新旧替代关系。产品文档当前规则要求任务标题用祈使形式，但也明确要求在 Jobs to Be Done 结构转换完成前不要改动既有 -ing 标题。摘要保留这一前提。

### 来源、改编与许可

作者为 Red Hat 及贡献者，核对日期 2026-10-16。两份配置都经过中文转述、节选和 CAT 保护适配，不是原文全文镜像，也不代表 Red Hat 官方认可。

- [redhat.json](redhat.json) 根据 Stylepedia 编写，原页面声明 [CC BY-SA 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/)。本摘要文件也按该许可提供。
- [redhat-product.json](redhat-product.json) 根据 Supplementary Guide 编写，[源仓库 README](https://github.com/redhat-documentation/supplementary-style-guide/blob/main/README.md)声明 [CC BY-SA 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)。本摘要文件也按该许可提供。

每条规则保留可定位的来源链接。两份摘要独立存储并通过 catalog.json 的 guideFiles 加载；对应许可不替换其他指南和应用代码各自的许可。再分发或改编这些摘要时保留署名、来源、改编说明和相应 ShareAlike 许可。
