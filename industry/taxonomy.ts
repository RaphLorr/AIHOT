// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// RetailHOT 关注品牌零售（奢侈品、运动服饰、美妆、快消）的数字化、智能化与 AI 化，不含连锁业态。
// 类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉模型怎么归类。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 */
export const CATEGORIES = [
  { key: "retail-ai", label: "AI 应用", section: "AI 应用", guide: "大模型、Agent、生成式 AI 在品牌零售的落地：智能导购、客服、营销内容生成、选品与设计、需求预测、数字人" },
  { key: "digital-ops", label: "数字化运营", section: "数字化运营", guide: "全渠道、会员与 CDP、私域、电商与直播、供应链与库存、OMS/ERP、数据中台等数字化运营的做法与进展" },
  { key: "store-tech", label: "智慧门店", section: "智慧门店", guide: "智能货架、RFID、电子价签、客流与热区分析、AR/虚拟试穿、门店机器人、无感支付等门店端技术" },
  { key: "industry", label: "品牌动态", section: "品牌动态", guide: "品牌与零售商在数字化、AI 方面的战略、组织、合作、投资并购、人事变动" },
  { key: "vendor", label: "厂商与产品", section: "厂商与产品", guide: "电商平台、SaaS、技术与数据服务商面向品牌零售的产品、功能与平台的发布和更新" },
  { key: "policy", label: "政策与数据", section: "政策与数据", guide: "监管与政策、数据合规、数字产品护照与溯源要求、行业报告与市场数据" },
  { key: "case", label: "案例与观点", section: "案例与观点", guide: "品牌数字化实践案例、方法论与教程、人物观点、评论、访谈与趋势讨论" },
] as const;

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["product_launch", "practice_case", "brand_move", "market_report", "opinion_analysis", "playbook_explainer"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。最后一个是兜底。 */
export const CATEGORY_TAGS = [
  "产品发布", "AI应用", "数字化运营", "门店科技", "品牌战略", "融资并购", "政策/监管", "行业数据", "案例/实践", "观点/趋势", "其他",
] as const;

/** 可选的主题标签：先是关注的四类品牌赛道，再是技术与业务方向。 */
export const TOPIC_TAGS = [
  "奢侈品", "运动服饰", "美妆", "快消",
  "生成式AI", "AI Agent", "智能导购", "智能客服", "营销自动化", "内容生成", "需求预测", "供应链", "全渠道", "会员/CDP", "私域",
  "直播电商", "虚拟试穿", "数字人", "跨境电商", "即时零售", "数据合规", "数字护照/溯源", "可持续", "AR/VR",
] as const;

/** 可选的实体标签（品牌集团、平台与技术厂商）。 */
export const ENTITY_TAGS = [
  "LVMH", "开云", "历峰", "爱马仕", "香奈儿", "耐克", "阿迪达斯", "安踏", "欧莱雅", "阿里巴巴", "京东", "抖音", "腾讯", "亚马逊",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  产品: "产品发布", 发布: "产品发布", 新品: "产品发布", 更新: "产品发布", 产品更新: "产品发布", 功能上线: "产品发布",
  AI: "AI应用", 人工智能: "AI应用", 大模型: "AI应用", AI落地: "AI应用", 智能化: "AI应用",
  数字化: "数字化运营", 数字化转型: "数字化运营", 运营: "数字化运营", 电商: "数字化运营",
  门店: "门店科技", 智慧门店: "门店科技", 新零售: "门店科技", 线下: "门店科技",
  战略: "品牌战略", 组织: "品牌战略", 合作: "品牌战略", 人事: "品牌战略", 公司动态: "品牌战略", 行业动态: "品牌战略",
  融资: "融资并购", 收购: "融资并购", 并购: "融资并购", 投资: "融资并购", "融资/收购": "融资并购",
  政策: "政策/监管", 监管: "政策/监管", 法规: "政策/监管", 合规: "政策/监管",
  数据: "行业数据", 报告: "行业数据", 研报: "行业数据", 市场数据: "行业数据", 财报: "行业数据",
  案例: "案例/实践", 实践: "案例/实践", 教程: "案例/实践", 方法论: "案例/实践", 最佳实践: "案例/实践", 指南: "案例/实践",
  观点: "观点/趋势", 趋势: "观点/趋势", 评论: "观点/趋势", 访谈: "观点/趋势",
  奢侈: "奢侈品", 奢牌: "奢侈品", 时尚: "奢侈品", 运动: "运动服饰", 运动品牌: "运动服饰", 服饰: "运动服饰",
  美妆护肤: "美妆", 护肤: "美妆", 化妆品: "美妆", 日化: "快消", 快消品: "快消", FMCG: "快消", CPG: "快消",
  AIGC: "生成式AI", 大语言模型: "生成式AI", LLM: "生成式AI", Agent: "AI Agent", 智能体: "AI Agent",
  导购: "智能导购", 客服: "智能客服", 营销: "营销自动化", 数字营销: "营销自动化", CDP: "会员/CDP", 会员: "会员/CDP",
  直播: "直播电商", 试穿: "虚拟试穿", 虚拟人: "数字人", 跨境: "跨境电商", 即时零售: "即时零售", 溯源: "数字护照/溯源", 数字产品护照: "数字护照/溯源",
  ESG: "可持续", 环保: "可持续",
};

/** 模型漏了分类标签时，按内容类型补一个。 */
export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  product_launch: "产品发布", practice_case: "案例/实践", brand_move: "品牌战略", market_report: "行业数据",
  opinion_analysis: "观点/趋势", playbook_explainer: "案例/实践",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/** 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  lvmh: { name: "LVMH", displayTag: "LVMH", aliases: ["LVMH", "路威酩轩", "Louis Vuitton", "路易威登", "Dior", "迪奥", "Sephora", "丝芙兰", "Tiffany", "蒂芙尼"] },
  kering: { name: "开云 Kering", displayTag: "开云", aliases: ["Kering", "开云", "Gucci", "古驰", "Saint Laurent", "圣罗兰", "Balenciaga", "巴黎世家"] },
  richemont: { name: "历峰 Richemont", displayTag: "历峰", aliases: ["Richemont", "历峰", "Cartier", "卡地亚", "Van Cleef", "梵克雅宝"] },
  hermes: { name: "爱马仕 Hermès", displayTag: "爱马仕", aliases: ["Hermès", "Hermes", "爱马仕"] },
  chanel: { name: "香奈儿 Chanel", displayTag: "香奈儿", aliases: ["Chanel", "香奈儿"] },
  nike: { name: "耐克 Nike", displayTag: "耐克", aliases: ["Nike", "耐克", "Jordan"] },
  adidas: { name: "阿迪达斯 adidas", displayTag: "阿迪达斯", aliases: ["adidas", "Adidas", "阿迪达斯"] },
  lululemon: { name: "lululemon", displayTag: null, aliases: ["lululemon", "露露乐蒙"] },
  anta: { name: "安踏 Anta", displayTag: "安踏", aliases: ["安踏", "Anta", "FILA", "斐乐", "迪桑特", "Descente", "始祖鸟", "Arc'teryx"] },
  loreal: { name: "欧莱雅 L'Oréal", displayTag: "欧莱雅", aliases: ["L'Oréal", "L’Oréal", "LOreal", "欧莱雅", "兰蔻", "Lancôme"] },
  "estee-lauder": { name: "雅诗兰黛 Estée Lauder", displayTag: null, aliases: ["Estée Lauder", "Estee Lauder", "雅诗兰黛"] },
  unilever: { name: "联合利华 Unilever", displayTag: null, aliases: ["Unilever", "联合利华"] },
  pg: { name: "宝洁 P&G", displayTag: null, aliases: ["P&G", "Procter & Gamble", "宝洁"] },
  alibaba: { name: "阿里巴巴", displayTag: "阿里巴巴", aliases: ["阿里巴巴", "阿里", "Alibaba", "天猫", "Tmall", "淘宝", "Taobao", "千问", "Qwen"] },
  jd: { name: "京东 JD.com", displayTag: "京东", aliases: ["京东", "JD.com", "JD"] },
  douyin: { name: "抖音电商", displayTag: "抖音", aliases: ["抖音", "Douyin", "TikTok Shop", "字节跳动", "ByteDance", "豆包"] },
  tencent: { name: "腾讯 智慧零售", displayTag: "腾讯", aliases: ["腾讯", "Tencent", "微信", "WeChat", "小程序", "视频号"] },
  amazon: { name: "亚马逊 Amazon", displayTag: "亚马逊", aliases: ["Amazon", "亚马逊", "AWS"] },
  shopify: { name: "Shopify", displayTag: null, aliases: ["Shopify"] },
  salesforce: { name: "Salesforce", displayTag: null, aliases: ["Salesforce"] },
  sap: { name: "SAP", displayTag: null, aliases: ["SAP"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "lvmh", name: "LVMH", patterns: [/\blvmh\b|路威酩轩|louis\s?vuitton|路易威登|\bdior\b|迪奥|sephora|丝芙兰|tiffany|蒂芙尼/i] },
  { id: "kering", name: "开云 Kering", patterns: [/\bkering\b|开云|\bgucci\b|古驰|saint\s?laurent|圣罗兰|balenciaga|巴黎世家/i] },
  { id: "richemont", name: "历峰 Richemont", patterns: [/richemont|历峰|cartier|卡地亚|van\s?cleef|梵克雅宝/i] },
  { id: "hermes", name: "爱马仕 Hermès", patterns: [/herm[eè]s|爱马仕/i] },
  { id: "chanel", name: "香奈儿 Chanel", patterns: [/\bchanel\b|香奈儿/i] },
  { id: "nike", name: "耐克 Nike", patterns: [/\bnike\b|耐克/i] },
  { id: "adidas", name: "阿迪达斯 adidas", patterns: [/\badidas\b|阿迪达斯/i] },
  { id: "lululemon", name: "lululemon", patterns: [/lululemon|露露乐蒙/i] },
  { id: "anta", name: "安踏 Anta", patterns: [/安踏|\banta\b|\bfila\b|斐乐|迪桑特|descente|始祖鸟|arc'?teryx/i] },
  { id: "loreal", name: "欧莱雅 L'Oréal", patterns: [/l['’]?or[eé]al|欧莱雅|兰蔻|lanc[oô]me/i] },
  { id: "estee-lauder", name: "雅诗兰黛", patterns: [/est[eé]e\s?lauder|雅诗兰黛/i] },
  { id: "unilever", name: "联合利华", patterns: [/unilever|联合利华/i] },
  { id: "pg", name: "宝洁 P&G", patterns: [/\bP&G\b|procter\s?(&|and)\s?gamble|宝洁/i] },
  { id: "alibaba", name: "阿里巴巴", patterns: [/阿里|alibaba|天猫|tmall|淘宝|taobao|千问|\bqwen/i] },
  { id: "jd", name: "京东", patterns: [/京东|\bjd\.com\b/i] },
  { id: "douyin", name: "抖音电商", patterns: [/抖音|douyin|tiktok|字节跳动|bytedance|豆包/i] },
  { id: "tencent", name: "腾讯", patterns: [/腾讯|tencent|微信|wechat|视频号/i] },
  { id: "amazon", name: "亚马逊 Amazon", patterns: [/amazon|亚马逊|\baws\b/i] },
  { id: "shopify", name: "Shopify", patterns: [/shopify/i] },
  { id: "salesforce", name: "Salesforce", patterns: [/salesforce/i] },
  { id: "sap", name: "SAP", patterns: [/\bSAP\b/] },
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|\bgemini\b|谷歌/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot|微软/i] },
  { id: "meta", name: "Meta", patterns: [/\bMeta\b/] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台如 GitHub、arXiv 不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "lvmh", domains: ["lvmh.com", "lvmh.cn"] },
  { entityId: "kering", domains: ["kering.com"] },
  { entityId: "richemont", domains: ["richemont.com"] },
  { entityId: "nike", domains: ["nike.com", "about.nike.com"] },
  { entityId: "adidas", domains: ["adidas-group.com"] },
  { entityId: "loreal", domains: ["loreal.com"] },
  { entityId: "alibaba", domains: ["alibabagroup.com", "alizila.com"] },
  { entityId: "jd", domains: ["jd.com", "jdcorporateblog.com"] },
  { entityId: "amazon", domains: ["aboutamazon.com"] },
  { entityId: "shopify", domains: ["shopify.com"] },
  { entityId: "salesforce", domains: ["salesforce.com"] },
  { entityId: "sap", domains: ["sap.com", "news.sap.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
