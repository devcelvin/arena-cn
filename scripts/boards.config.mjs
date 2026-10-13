/**
 * boards.config.mjs — 榜单配置（唯一需要维护的清单）
 *
 * 严格对齐 arena.ai 的三级分类（依据其 sitemap.xml，共 83 条 /leaderboard* URL）：
 *   一级  大类     group：智能体 / 对话 / 代码 / 图像 / 视频
 *   二级  榜单     无 parent，snapshot: true（参与每日快照与趋势）
 *   三级  类别     带 parent（指向所属二级榜单 id），只出 latest，不写快照
 *
 * 字段说明：
 *   page.id       页面唯一 id（同时是 raw HTML 文件名）
 *   page.url      arena.ai 页面路径
 *   page.kind     'category'（常规榜单页，解析全部模型对象）
 *                 'home'（主页，解析 3 组 Agent 列表 + 会话统计 + pills 数据日期）
 *                 'container'（仅分组节点：该页本身客户端渲染无自有数据，
 *                              只为三级树保留位置，不抓取、不产出 latest）
 *                 'stats'（只抓页头统计不产出榜单；/leaderboard/agent 用，
 *                          供智能体三榜取数据日期 —— 首页 pills 已不再带 trends）
 *   board.id      榜单 id（data/latest/{id}.json），= URL 路径去 /leaderboard/ 后斜杠转连字符
 *   board.name    中文名
 *   board.group   一级大类
 *   board.scale   量纲：'elo' | 'bt'
 *   board.parent  三级类别：所属二级榜单 id
 *   board.snapshot 是否参与每日快照/历史趋势（仅二级榜单）
 *   board.listIndex / pillId  仅首页：取第几组 Agent 列表 / 对应源站 pill id
 */

export const PAGES = [
  {
    id: 'home',
    url: '/leaderboard',
    kind: 'home',
    boards: [
      { id: 'agent', name: '智能体总榜', group: '智能体', scale: 'bt', listIndex: 0, pillId: 'best-overall-agents' },
      { id: 'agent-coding', name: '编程智能体榜', group: '智能体', scale: 'bt', listIndex: 1, pillId: 'agentic-coding' },
      { id: 'agent-aligned', name: '对齐偏好智能体榜', group: '智能体', scale: 'bt', listIndex: 2, pillId: 'safest-agents' },
    ],
  },
  {
    id: 'agent',
    url: '/leaderboard/agent',
    kind: 'stats',
    boards: [

    ],
  },
  {
    id: 'chat-document',
    url: '/leaderboard/chat/document',
    kind: 'category',
    boards: [
      { id: 'chat-document', name: '文档理解榜', group: '对话', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'chat-search',
    url: '/leaderboard/chat/search',
    kind: 'category',
    boards: [
      { id: 'chat-search', name: '联网搜索榜', group: '对话', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'chat-text',
    url: '/leaderboard/chat/text',
    kind: 'category',
    boards: [
      { id: 'chat-text', name: '文本对话榜', group: '对话', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'chat-text-chinese',
    url: '/leaderboard/chat/text/chinese',
    kind: 'category',
    boards: [
      { id: 'chat-text-chinese', name: '中文', group: '对话', scale: 'elo', parent: 'chat-text', highlight: true },
    ],
  },
  {
    id: 'chat-text-coding',
    url: '/leaderboard/chat/text/coding',
    kind: 'category',
    boards: [
      { id: 'chat-text-coding', name: '代码', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-creative-writing',
    url: '/leaderboard/chat/text/creative-writing',
    kind: 'category',
    boards: [
      { id: 'chat-text-creative-writing', name: '创意写作', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-english',
    url: '/leaderboard/chat/text/english',
    kind: 'category',
    boards: [
      { id: 'chat-text-english', name: '英语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-exclude-ties',
    url: '/leaderboard/chat/text/exclude-ties',
    kind: 'category',
    boards: [
      { id: 'chat-text-exclude-ties', name: '排除平票', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-expert',
    url: '/leaderboard/chat/text/expert',
    kind: 'category',
    boards: [
      { id: 'chat-text-expert', name: '专家级', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-french',
    url: '/leaderboard/chat/text/french',
    kind: 'category',
    boards: [
      { id: 'chat-text-french', name: '法语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-german',
    url: '/leaderboard/chat/text/german',
    kind: 'category',
    boards: [
      { id: 'chat-text-german', name: '德语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-hard-prompts',
    url: '/leaderboard/chat/text/hard-prompts',
    kind: 'category',
    boards: [
      { id: 'chat-text-hard-prompts', name: '高难度提问', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-hard-prompts-english',
    url: '/leaderboard/chat/text/hard-prompts-english',
    kind: 'category',
    boards: [
      { id: 'chat-text-hard-prompts-english', name: '高难度提问（英文）', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-business-and-management-and-financial-operations',
    url: '/leaderboard/chat/text/industry-business-and-management-and-financial-operations',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-business-and-management-and-financial-operations', name: '行业·商业管理与金融', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-entertainment-and-sports-and-media',
    url: '/leaderboard/chat/text/industry-entertainment-and-sports-and-media',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-entertainment-and-sports-and-media', name: '行业·娱乐体育与媒体', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-legal-and-government',
    url: '/leaderboard/chat/text/industry-legal-and-government',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-legal-and-government', name: '行业·法律与政府', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-life-and-physical-and-social-science',
    url: '/leaderboard/chat/text/industry-life-and-physical-and-social-science',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-life-and-physical-and-social-science', name: '行业·生命与社会科学', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-mathematical',
    url: '/leaderboard/chat/text/industry-mathematical',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-mathematical', name: '行业·数学', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-medicine-and-healthcare',
    url: '/leaderboard/chat/text/industry-medicine-and-healthcare',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-medicine-and-healthcare', name: '行业·医疗健康', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-software-and-it-services',
    url: '/leaderboard/chat/text/industry-software-and-it-services',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-software-and-it-services', name: '行业·软件与 IT 服务', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-industry-writing-and-literature-and-language',
    url: '/leaderboard/chat/text/industry-writing-and-literature-and-language',
    kind: 'category',
    boards: [
      { id: 'chat-text-industry-writing-and-literature-and-language', name: '行业·写作文学与语言', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-instruction-following',
    url: '/leaderboard/chat/text/instruction-following',
    kind: 'category',
    boards: [
      { id: 'chat-text-instruction-following', name: '指令遵循', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-japanese',
    url: '/leaderboard/chat/text/japanese',
    kind: 'category',
    boards: [
      { id: 'chat-text-japanese', name: '日语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-korean',
    url: '/leaderboard/chat/text/korean',
    kind: 'category',
    boards: [
      { id: 'chat-text-korean', name: '韩语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-longer-query',
    url: '/leaderboard/chat/text/longer-query',
    kind: 'category',
    boards: [
      { id: 'chat-text-longer-query', name: '长文本提问', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-math',
    url: '/leaderboard/chat/text/math',
    kind: 'category',
    boards: [
      { id: 'chat-text-math', name: '数学', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-multi-turn',
    url: '/leaderboard/chat/text/multi-turn',
    kind: 'category',
    boards: [
      { id: 'chat-text-multi-turn', name: '多轮对话', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-non-english',
    url: '/leaderboard/chat/text/non-english',
    kind: 'category',
    boards: [
      { id: 'chat-text-non-english', name: '非英语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-polish',
    url: '/leaderboard/chat/text/polish',
    kind: 'category',
    boards: [
      { id: 'chat-text-polish', name: '波兰语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-russian',
    url: '/leaderboard/chat/text/russian',
    kind: 'category',
    boards: [
      { id: 'chat-text-russian', name: '俄语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-text-spanish',
    url: '/leaderboard/chat/text/spanish',
    kind: 'category',
    boards: [
      { id: 'chat-text-spanish', name: '西班牙语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    id: 'chat-vision',
    url: '/leaderboard/chat/vision',
    kind: 'category',
    boards: [
      { id: 'chat-vision', name: '视觉问答榜', group: '对话', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'chat-vision-captioning',
    url: '/leaderboard/chat/vision/captioning',
    kind: 'category',
    boards: [
      { id: 'chat-vision-captioning', name: '图像描述', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-chinese',
    url: '/leaderboard/chat/vision/chinese',
    kind: 'category',
    boards: [
      { id: 'chat-vision-chinese', name: '中文', group: '对话', scale: 'elo', parent: 'chat-vision', highlight: true },
    ],
  },
  {
    id: 'chat-vision-creative-writing',
    url: '/leaderboard/chat/vision/creative-writing',
    kind: 'category',
    boards: [
      { id: 'chat-vision-creative-writing', name: '创意写作', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-diagram',
    url: '/leaderboard/chat/vision/diagram',
    kind: 'category',
    boards: [
      { id: 'chat-vision-diagram', name: '图表理解', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-english',
    url: '/leaderboard/chat/vision/english',
    kind: 'category',
    boards: [
      { id: 'chat-vision-english', name: '英语', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-entity-recognition',
    url: '/leaderboard/chat/vision/entity-recognition',
    kind: 'category',
    boards: [
      { id: 'chat-vision-entity-recognition', name: '实体识别', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-homework',
    url: '/leaderboard/chat/vision/homework',
    kind: 'category',
    boards: [
      { id: 'chat-vision-homework', name: '作业解题', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-humor',
    url: '/leaderboard/chat/vision/humor',
    kind: 'category',
    boards: [
      { id: 'chat-vision-humor', name: '幽默理解', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'chat-vision-ocr',
    url: '/leaderboard/chat/vision/ocr',
    kind: 'category',
    boards: [
      { id: 'chat-vision-ocr', name: '文字识别', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    id: 'code-image-to-webdev',
    url: '/leaderboard/code/image-to-webdev',
    kind: 'category',
    boards: [
      { id: 'code-image-to-webdev', name: '图像转网页榜', group: '代码', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'code-webdev',
    url: '/leaderboard/code/webdev',
    kind: 'category',
    boards: [
      { id: 'code-webdev', name: 'Web 开发榜', group: '代码', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'code-webdev-brand-marketing',
    url: '/leaderboard/code/webdev/brand-marketing',
    kind: 'category',
    boards: [
      { id: 'code-webdev-brand-marketing', name: '品牌营销', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-consumer-product',
    url: '/leaderboard/code/webdev/consumer-product',
    kind: 'category',
    boards: [
      { id: 'code-webdev-consumer-product', name: '消费产品', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-content-creation-tools',
    url: '/leaderboard/code/webdev/content-creation-tools',
    kind: 'category',
    boards: [
      { id: 'code-webdev-content-creation-tools', name: '内容创作工具', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-data-analytics',
    url: '/leaderboard/code/webdev/data-analytics',
    kind: 'category',
    boards: [
      { id: 'code-webdev-data-analytics', name: '数据分析', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-frontend',
    url: '/leaderboard/code/webdev/frontend',
    kind: 'category',
    boards: [
      { id: 'code-webdev-frontend', name: '前端', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-fullstack',
    url: '/leaderboard/code/webdev/fullstack',
    kind: 'category',
    boards: [
      { id: 'code-webdev-fullstack', name: '全栈', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-gaming',
    url: '/leaderboard/code/webdev/gaming',
    kind: 'category',
    boards: [
      { id: 'code-webdev-gaming', name: '游戏', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-html',
    url: '/leaderboard/code/webdev/html',
    kind: 'category',
    boards: [
      { id: 'code-webdev-html', name: 'HTML', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-react',
    url: '/leaderboard/code/webdev/react',
    kind: 'category',
    boards: [
      { id: 'code-webdev-react', name: 'React', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-reference-based-design',
    url: '/leaderboard/code/webdev/reference-based-design',
    kind: 'category',
    boards: [
      { id: 'code-webdev-reference-based-design', name: '参考图设计', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'code-webdev-simulations',
    url: '/leaderboard/code/webdev/simulations',
    kind: 'category',
    boards: [
      { id: 'code-webdev-simulations', name: '交互模拟', group: '代码', scale: 'elo', parent: 'code-webdev' },
    ],
  },
  {
    id: 'image-image-edit-multi-image',
    url: '/leaderboard/image/image-edit/multi-image',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image', name: '多图编辑', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-3d-modeling',
    url: '/leaderboard/image/image-edit/multi-image-3d-modeling',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-3d-modeling', name: '多图·3D 建模', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-art',
    url: '/leaderboard/image/image-edit/multi-image-art',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-art', name: '多图·艺术', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-cartoon',
    url: '/leaderboard/image/image-edit/multi-image-cartoon',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-cartoon', name: '多图·卡通', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-commercial-design',
    url: '/leaderboard/image/image-edit/multi-image-commercial-design',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-commercial-design', name: '多图·商业设计', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-photorealistic',
    url: '/leaderboard/image/image-edit/multi-image-photorealistic',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-photorealistic', name: '多图·真实摄影', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-portraits',
    url: '/leaderboard/image/image-edit/multi-image-portraits',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-portraits', name: '多图·人像', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-multi-image-text-rendering',
    url: '/leaderboard/image/image-edit/multi-image-text-rendering',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-multi-image-text-rendering', name: '多图·文字渲染', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image',
    url: '/leaderboard/image/image-edit/single-image',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image', name: '单图编辑', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-3d-modeling',
    url: '/leaderboard/image/image-edit/single-image-3d-modeling',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-3d-modeling', name: '单图·3D 建模', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-art',
    url: '/leaderboard/image/image-edit/single-image-art',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-art', name: '单图·艺术', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-cartoon',
    url: '/leaderboard/image/image-edit/single-image-cartoon',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-cartoon', name: '单图·卡通', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-commercial-design',
    url: '/leaderboard/image/image-edit/single-image-commercial-design',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-commercial-design', name: '单图·商业设计', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-photorealistic',
    url: '/leaderboard/image/image-edit/single-image-photorealistic',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-photorealistic', name: '单图·真实摄影', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-portraits',
    url: '/leaderboard/image/image-edit/single-image-portraits',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-portraits', name: '单图·人像', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-image-edit-single-image-text-rendering',
    url: '/leaderboard/image/image-edit/single-image-text-rendering',
    kind: 'category',
    boards: [
      { id: 'image-image-edit-single-image-text-rendering', name: '单图·文字渲染', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    id: 'image-text-to-image',
    url: '/leaderboard/image/text-to-image',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image', name: '文生图榜', group: '图像', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'image-text-to-image-3d-modeling',
    url: '/leaderboard/image/text-to-image/3d-modeling',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-3d-modeling', name: '3D 建模', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-art',
    url: '/leaderboard/image/text-to-image/art',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-art', name: '艺术', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-cartoon',
    url: '/leaderboard/image/text-to-image/cartoon',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-cartoon', name: '卡通动漫', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-commercial-design',
    url: '/leaderboard/image/text-to-image/commercial-design',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-commercial-design', name: '商业设计', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-photorealistic',
    url: '/leaderboard/image/text-to-image/photorealistic',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-photorealistic', name: '真实摄影', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-portraits',
    url: '/leaderboard/image/text-to-image/portraits',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-portraits', name: '人像', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'image-text-to-image-text-rendering',
    url: '/leaderboard/image/text-to-image/text-rendering',
    kind: 'category',
    boards: [
      { id: 'image-text-to-image-text-rendering', name: '文字渲染', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    id: 'video-image-to-video',
    url: '/leaderboard/video/image-to-video',
    kind: 'category',
    boards: [
      { id: 'video-image-to-video', name: '图生视频榜', group: '视频', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'video-text-to-video',
    url: '/leaderboard/video/text-to-video',
    kind: 'category',
    boards: [
      { id: 'video-text-to-video', name: '文生视频榜', group: '视频', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'video-video-edit',
    url: '/leaderboard/video/video-edit',
    kind: 'category',
    boards: [
      { id: 'video-video-edit', name: '视频编辑榜', group: '视频', scale: 'elo', snapshot: true },
    ],
  },
  {
    id: 'image-image-edit',
    url: '/leaderboard/image/image-edit',
    kind: 'container',
    boards: [
      { id: 'image-image-edit', name: '图像编辑榜', group: '图像', scale: 'elo', snapshot: true },
    ],
  },
];

/** 扁平化：所有榜单定义 */
export const BOARDS = PAGES.flatMap((p) =>
  p.boards.map((b) => ({ ...b, pageId: p.id, pageUrl: p.url, pageKind: p.kind }))
);

/** 一级大类顺序 */
export const GROUP_ORDER = ['智能体', '对话', '代码', '图像', '视频'];

/** 大类图标 */
export const GROUP_ICON = { 智能体: '🤖', 对话: '💬', 代码: '⌨️', 图像: '🎨', 视频: '🎬' };

export const SOURCE_BASE = 'https://arena.ai';

export const UA = 'ArenaCN-Bot/1.0 (+https://github.com/arena-cn/arena-cn)';
