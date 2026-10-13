/**
 * boards.config.mjs — 榜单配置（唯一需要维护的清单）
 *
 * ============================ 数据来源与授权 ============================
 * 数据来自 LMArena（lmarena-ai）官方在 Hugging Face 公开发布的榜单数据集：
 *   https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset
 * 该数据集以 **CC BY 4.0** 授权，允许复制、再分发、改编与商用，唯一条件是署名
 * （署名块见 web/index.html 页脚，许可证链接见 SOURCE.licenseUrl）。
 *
 * ⚠️ 本项目**不再抓取** arena.ai 站点页面。依据 arena.ai《Terms of Use》
 *    （最后更新 2026-02-23）：
 *      §5(vi) 禁止 programmatic / automated access
 *      §5(vii) 禁止 scrape / extract / download data
 *      §5(i) 禁止 reproduce / mirror / distribute / host / commercially exploit
 *      §5(v) 禁止 translate 与制作衍生作品
 *      §1 使用范围限定 personal or internal business use
 *    镜像站形态无法在其 ToS 下合规；改用官方主动发布、且明确以 CC BY 4.0 授权的
 *    数据集，可彻底消除上述风险。
 *
 * 字段差异：多数 subset 用 rating / rating_lower / rating_upper / vote_count；
 *          agent subset 用 score / score_ci_lower / score_ci_upper / session_count
 *          （映射见 fetch-hf.mjs 的 readRows）。
 *
 * 结构：
 *   一级  大类 group：智能体 / 对话 / 代码 / 图像 / 视频
 *   二级  榜单 parent=null（参与每日快照与趋势）
 *   三级  类别 parent=所属二级榜 id（只出 latest，不写快照）
 */

export const SOURCE = {
  dataset: 'lmarena-ai/leaderboard-dataset',
  url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: 'LMArena (lmarena-ai)',
  parquetBase: 'https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset/parquet',
  split: 'latest',
};

export const UA = 'ArenaCN-Bot/2.0 (CC-BY-4.0 dataset fetcher)';

/**
 * subset → 榜单清单
 *   config ：HF 数据集的 subset（config）名
 *   variant：'rating'（常规字段）| 'agent'（agent subset 字段名不同）
 *   boards ：该 subset 下的榜单；cat 为 HF 行内 category 字段值
 */
export const SUBSETS = [
  {
    // 智能体放首位：一级大类顺序（智能体 → 对话 → 代码 → 图像 → 视频）由本数组顺序决定，
    // 与换源前的站点结构保持一致，避免默认落地页与外链深链发生跳变。
    config: 'agent',
    variant: 'agent',
    boards: [
      { id: 'agent-overall', cat: 'overall', name: '智能体总榜', group: '智能体', scale: 'bt', parent: null, snapshot: true },
    ],
  },
  {
    // ⚠️ 必须用 style_control 变体：与源站榜单页默认展示口径一致。
    // 实测比对（旧站抓自源站页 vs 数据集，top1 偏差 0.0）：
    //   text              → top1 1533.9，与源站 1525.4 不符
    //   text_style_control → top1 1525.4 ✅（overall/chinese/coding/math/hard_prompts 5 项全中）
    config: 'text_style_control',
    variant: 'rating',
    boards: [
      { id: 'chat-text', cat: 'overall', name: '文本对话榜', group: '对话', scale: 'elo', parent: null, snapshot: true },
      { id: 'chat-text-chinese', cat: 'chinese', name: '中文', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-coding', cat: 'coding', name: '代码', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-creative-writing', cat: 'creative_writing', name: '创意写作', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-english', cat: 'english', name: '英语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-exclude-ties', cat: 'exclude_ties', name: '排除平票', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-expert', cat: 'expert', name: '专家级', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-french', cat: 'french', name: '法语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-german', cat: 'german', name: '德语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-hard-prompts', cat: 'hard_prompts', name: '高难度提问', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-hard-prompts-english', cat: 'hard_prompts_english', name: '高难度提问（英文）', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-business-and-management-and-financial-operations', cat: 'industry_business_and_management_and_financial_operations', name: '行业·商业管理与金融', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-entertainment-and-sports-and-media', cat: 'industry_entertainment_and_sports_and_media', name: '行业·娱乐体育与媒体', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-legal-and-government', cat: 'industry_legal_and_government', name: '行业·法律与政府', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-life-and-physical-and-social-science', cat: 'industry_life_and_physical_and_social_science', name: '行业·生命与社会科学', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-mathematical', cat: 'industry_mathematical', name: '行业·数学', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-medicine-and-healthcare', cat: 'industry_medicine_and_healthcare', name: '行业·医疗健康', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-software-and-it-services', cat: 'industry_software_and_it_services', name: '行业·软件与 IT 服务', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-industry-writing-and-literature-and-language', cat: 'industry_writing_and_literature_and_language', name: '行业·写作文学与语言', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-instruction-following', cat: 'instruction_following', name: '指令遵循', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-japanese', cat: 'japanese', name: '日语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-korean', cat: 'korean', name: '韩语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-longer-query', cat: 'longer_query', name: '长文本提问', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-math', cat: 'math', name: '数学', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-multi-turn', cat: 'multi_turn', name: '多轮对话', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-non-english', cat: 'non_english', name: '非英语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-polish', cat: 'polish', name: '波兰语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-russian', cat: 'russian', name: '俄语', group: '对话', scale: 'elo', parent: 'chat-text' },
      { id: 'chat-text-spanish', cat: 'spanish', name: '西班牙语', group: '对话', scale: 'elo', parent: 'chat-text' },
    ],
  },
  {
    // ⚠️ 同文本榜：源站视觉榜默认展示 style_control 口径（10 个类别 top1 全部偏差 0.0 命中）
    config: 'vision_style_control',
    variant: 'rating',
    boards: [
      { id: 'chat-vision', cat: 'overall', name: '视觉问答榜', group: '对话', scale: 'elo', parent: null, snapshot: true },
      { id: 'chat-vision-captioning', cat: 'captioning', name: '图像描述', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-chinese', cat: 'chinese', name: '中文', group: '对话', scale: 'elo', parent: 'chat-vision' },
      // 数据集里 creative_writing 与 creative_writing_vision 是两个不同的榜；
      // 与源站「创意写作」页（101 个模型、top1 1324.5）逐位吻合的是 creative_writing_vision。
      // 另一类 creative_writing 仅 34 个模型且数据日期停在 2026-01-09，属历史残留，不收录。
      { id: 'chat-vision-creative-writing', cat: 'creative_writing_vision', name: '创意写作', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-diagram', cat: 'diagram', name: '图表理解', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-english', cat: 'english', name: '英语', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-entity-recognition', cat: 'entity_recognition', name: '实体识别', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-homework', cat: 'homework', name: '作业解题', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-humor', cat: 'humor', name: '幽默理解', group: '对话', scale: 'elo', parent: 'chat-vision' },
      { id: 'chat-vision-ocr', cat: 'ocr', name: '文字识别', group: '对话', scale: 'elo', parent: 'chat-vision' },
    ],
  },
  {
    config: 'search',
    variant: 'rating',
    boards: [
      { id: 'chat-search', cat: 'overall', name: '联网搜索榜', group: '对话', scale: 'elo', parent: null, snapshot: true },
    ],
  },
  {
    config: 'document',
    variant: 'rating',
    boards: [
      { id: 'chat-document', cat: 'overall', name: '文档理解榜', group: '对话', scale: 'elo', parent: null, snapshot: true },
    ],
  },
  {
    config: 'webdev',
    variant: 'rating',
    boards: [
      { id: 'code-webdev', cat: 'overall', name: 'Web 开发榜', group: '代码', scale: 'elo', parent: null, snapshot: true },
      // 注：数据集里还有 category='webdev' 的一类，实测与 overall 逐行完全一致（141 个模型、分数相同），
      //     属重复榜单，故不单列，避免同一份数据出现两个入口。
      { id: 'code-webdev-html', cat: 'webdev-html', name: 'HTML', group: '代码', scale: 'elo', parent: 'code-webdev' },
      { id: 'code-webdev-react', cat: 'webdev-react', name: 'React', group: '代码', scale: 'elo', parent: 'code-webdev' },
      { id: 'code-image-to-webdev', cat: 'image_to_webdev', name: '图像转网页榜', group: '代码', scale: 'elo', parent: null, snapshot: true },
    ],
  },
  {
    config: 'text_to_image',
    variant: 'rating',
    boards: [
      { id: 'image-text-to-image', cat: 'overall', name: '文生图榜', group: '图像', scale: 'elo', parent: null, snapshot: true },
      { id: 'image-text-to-image-3d-modeling', cat: '3d_modeling', name: '3D 建模', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      { id: 'image-text-to-image-art', cat: 'art', name: '艺术', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      { id: 'image-text-to-image-cartoon', cat: 'cartoon', name: '卡通动漫', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      { id: 'image-text-to-image-commercial-design', cat: 'commercial_design', name: '商业设计', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      { id: 'image-text-to-image-photorealistic', cat: 'photorealistic', name: '真实摄影', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      // 注：数据集里 chinese / english / russian 三类虽存在，但数据日期停留在 2025-01～2025-02、
      //     各仅 8 个模型，属未再更新的历史残留，展示会误导，故不收录。
      { id: 'image-text-to-image-portraits', cat: 'portraits', name: '人像', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
      { id: 'image-text-to-image-text-rendering', cat: 'text_rendering', name: '文字渲染', group: '图像', scale: 'elo', parent: 'image-text-to-image' },
    ],
  },
  {
    config: 'image_edit',
    variant: 'rating',
    boards: [
      { id: 'image-image-edit', cat: 'overall', name: '图像编辑榜', group: '图像', scale: 'elo', parent: null, snapshot: true },
      { id: 'image-image-edit-multi-image', cat: 'multi_image_edit', name: '多图编辑', group: '图像', scale: 'elo', parent: 'image-image-edit' },
    ],
  },
  {
    config: 'text_to_video',
    variant: 'rating',
    boards: [
      { id: 'video-text-to-video', cat: 'overall', name: '文生视频榜', group: '视频', scale: 'elo', parent: null, snapshot: true },
    ],
  },
  {
    config: 'image_to_video',
    variant: 'rating',
    boards: [
      { id: 'video-image-to-video', cat: 'overall', name: '图生视频榜', group: '视频', scale: 'elo', parent: null, snapshot: true },
    ],
  },
  {
    config: 'video_edit',
    variant: 'rating',
    boards: [
      { id: 'video-video-edit', cat: 'overall', name: '视频编辑榜', group: '视频', scale: 'elo', parent: null, snapshot: true },
    ],
  },
];

/** 扁平榜单清单（供 index.json / 落库 / 孤儿清理使用） */
export const BOARDS = SUBSETS.flatMap((s) =>
  s.boards.map((b) => ({ ...b, config: s.config, variant: s.variant }))
);

/** 需要下载的 subset 去重清单 */
export const CONFIGS = [...new Set(SUBSETS.map((s) => s.config))];
