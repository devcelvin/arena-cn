/**
 * boards.config.mjs — 榜单配置（唯一需要维护的清单）
 *
 * 每个抓取页面（page）产出一个或多个榜单（boards）。
 * 字段说明：
 *   page.id        页面唯一 id（同时是 raw HTML 文件名）
 *   page.url       arena.ai 页面路径
 *   page.kind      'category'（普通分类页，解析全部模型对象）
 *                  'home'（主页，解析 3 组 Agent 列表 + 会话统计）
 *   boards[]       该页面产出的榜单：
 *     id          榜单 id（data/latest/{id}.json）
 *     name        中文名
 *     group       分组（智能体/对话/代码/图像/视频）
 *     scale       量纲：'elo' | 'winrate'
 *     listIndex   仅 home 页：取第几组 Agent 列表（0=最佳综合, 1=最佳编程, 2=最佳对齐）
 *     highlight   true = 国内精选（小类选择器里标 ★ 并给淡蓝底）
 */

export const PAGES = [
  {
    id: 'home',
    url: '/leaderboard',
    kind: 'home',
    boards: [
      { id: 'agent',          name: '智能体总榜',     group: '智能体', scale: 'bt', listIndex: 0 },
      { id: 'agent-coding',   name: '编程智能体榜',   group: '智能体', scale: 'bt', listIndex: 1 },
      { id: 'agent-aligned',  name: '对齐偏好智能体榜', group: '智能体', scale: 'bt', listIndex: 2 },
    ],
  },
  {
    id: 'text',
    url: '/leaderboard/chat/text',
    kind: 'category',
    boards: [{ id: 'text', name: '文本对话总榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'text-chinese',
    url: '/leaderboard/chat/text/chinese',
    kind: 'category',
    boards: [{ id: 'text-chinese', name: '中文对话榜', group: '对话', scale: 'elo', highlight: true }],
  },
  {
    id: 'text-coding',
    url: '/leaderboard/chat/text/coding',
    kind: 'category',
    boards: [{ id: 'text-coding', name: '代码能力榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'text-math',
    url: '/leaderboard/chat/text/math',
    kind: 'category',
    boards: [{ id: 'text-math', name: '数学能力榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'text-creative',
    url: '/leaderboard/chat/text/creative-writing',
    kind: 'category',
    boards: [{ id: 'text-creative', name: '创意写作榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'text-instruction',
    url: '/leaderboard/chat/text/instruction-following',
    kind: 'category',
    boards: [{ id: 'text-instruction', name: '指令遵循榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'vision',
    url: '/leaderboard/chat/vision',
    kind: 'category',
    boards: [{ id: 'vision', name: '视觉问答榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'vision-chinese',
    url: '/leaderboard/chat/vision/chinese',
    kind: 'category',
    boards: [{ id: 'vision-chinese', name: '中文视觉榜', group: '对话', scale: 'elo', highlight: true }],
  },
  {
    id: 'document',
    url: '/leaderboard/chat/document',
    kind: 'category',
    boards: [{ id: 'document', name: '文档理解榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'search',
    url: '/leaderboard/chat/search',
    kind: 'category',
    boards: [{ id: 'search', name: '联网搜索榜', group: '对话', scale: 'elo' }],
  },
  {
    id: 'webdev',
    url: '/leaderboard/code/webdev',
    kind: 'category',
    boards: [{ id: 'webdev', name: 'Web 开发榜', group: '代码', scale: 'elo' }],
  },
  {
    id: 'image-to-webdev',
    url: '/leaderboard/code/image-to-webdev',
    kind: 'category',
    boards: [{ id: 'image-to-webdev', name: '图像转网页榜', group: '代码', scale: 'elo' }],
  },
  {
    id: 'text-to-image',
    url: '/leaderboard/image/text-to-image',
    kind: 'category',
    boards: [{ id: 'text-to-image', name: '文生图榜', group: '图像', scale: 'elo' }],
  },
  // 注：/leaderboard/image/image-edit 为客户端渲染，HTML 无内嵌数据，
  // 与 /leaderboard/agent 一样需逆向前端接口，暂列 P2，故本清单不含该榜。
  {
    id: 'text-to-video',
    url: '/leaderboard/video/text-to-video',
    kind: 'category',
    boards: [{ id: 'text-to-video', name: '文生视频榜', group: '视频', scale: 'elo' }],
  },
  {
    id: 'image-to-video',
    url: '/leaderboard/video/image-to-video',
    kind: 'category',
    boards: [{ id: 'image-to-video', name: '图生视频榜', group: '视频', scale: 'elo' }],
  },
  {
    id: 'video-edit',
    url: '/leaderboard/video/video-edit',
    kind: 'category',
    boards: [{ id: 'video-edit', name: '视频编辑榜', group: '视频', scale: 'elo' }],
  },
];

/** 扁平化：所有榜单定义 */
export const BOARDS = PAGES.flatMap((p) =>
  p.boards.map((b) => ({ ...b, pageId: p.id, pageUrl: p.url, pageKind: p.kind }))
);

export const GROUP_ORDER = ['智能体', '对话', '代码', '图像', '视频'];

export const SOURCE_BASE = 'https://arena.ai';

export const UA = 'ArenaCN-Bot/1.0 (+https://github.com/arena-cn/arena-cn)';
