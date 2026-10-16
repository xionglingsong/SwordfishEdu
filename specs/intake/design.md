# 设计

沿用 Electron + Java，增加 BusinessStore 统一业务服务；本机 business/data.json 保存客户、委托、报价和支付记录，原子替换写入，服务内串行操作。更新使用 revision 防止界面与 Agent 相互覆盖。

材料和来源保存在委托中，文件分析建立不可变快照目录。文件使用现有 OpenXLIFF 转换器，按 XLIFF 原文计算三种口径：CAT words、非空白 Unicode code points（包括标点数字）、Han code points。不宣称 Word 计数等价或包含图片/OCR。报价基于当前分析和单价，文件/语言改变需重新分析。

新项目复制分析文件到独立项目目录，改写 skeleton 路径并注册到现有 projects.json。确定性项目 ID + 项目存在检查用于幂等恢复。已有委托可更新 brief，但禁止在已创建项目上换原文或语言而不建新委托。

Brief 使用字段白名单并固定当前风格，不把业务原文或联系/财务数据拼接到模型。AI Tutor 通过主进程读取 brief；CLI read/brief 输出同一简报与 AI 限制。禁止或本地模型限定的委托在 AI Tutor 外部请求之前阻断。

界面：现有 Projects 工具栏新增“接单建项”；双栏工作窗，左列表右表单；深浅主题沿用现有 CSS。任务、文件、报价分节，关键未知项和分析警告直接展示。货币与语言用明确输入，不提供虚构默认价格。
