# 大模型竞技榜（leaderboard-cn）

LMArena 官方 AI 模型对战榜单的**中文呈现站**：每日自动同步官方公开数据集，全中文界面，国内可访问，**全程零成本**（GitHub Actions + GitHub Pages + Gitee Pages 免费层，无服务器、无数据库、无构建步骤）。

当前覆盖 **59 个榜单**，按「大类 → 榜单 → 类别」三级联动组织：

- **一级 · 大类**（5 个）：智能体 / 对话 / 代码 / 图像 / 视频
- **二级 · 榜单**（12 个）：智能体总榜、文本对话榜、视觉问答榜、联网搜索榜、文档理解榜、Web 开发榜、图像转网页榜、文生图榜、图像编辑榜、文生视频榜、图生视频榜、视频编辑榜
- **三级 · 类别**（47 个）：随榜单联动，如文本对话榜下 28 个（中文、数学、代码、创意写作、指令遵循、各语种、各行业…）、视觉问答榜下 10 个、文生图榜下 7 个

---

## 数据来源与授权（重要）

数据来自 LMArena（lmarena-ai）**官方在 Hugging Face 公开发布的榜单数据集**：

- 数据集：<https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset>
- 授权：**CC BY 4.0**（允许复制、再分发、改编、商用，条件是署名）
- 署名已落实在页脚与 `data/index.json` 的 `source` 字段：署名 + 许可证链接 + 改动说明

### 为什么不直接抓 arena.ai 榜单页

arena.ai《Terms of Use》（最后更新 2026-02-23）明确禁止：

| 条款 | 内容 |
| --- | --- |
| §5(vi) | 禁止 programmatic / automated access |
| §5(vii) | 禁止 scrape / extract / download data |
| §5(i) | 禁止 reproduce / **mirror** / distribute / host / commercially exploit |
| §5(v) | 禁止 **translate** 与制作衍生作品 |
| §1 | 使用范围仅限 personal or internal business use |
| §4.2 | Arena / Arena Intelligence 及相关标识为商标，未经许可不得用于自有产品 |

镜像站形态在该 ToS 下无法合规（"全量搬运 + 中文化"同时命中 mirror 与 translate 两条）。改用官方主动发布、且明确以 CC BY 4.0 授权的数据集后，上述风险消除，**且数据数值与源站榜单页完全一致**（实测各榜 top1 偏差 0.0）。

> 本项目**不抓取任何 arena.ai 页面**，也不使用其商标作为产品名。
> 站点与 LMArena 无隶属或授权关系。

---

## 在线地址

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| GitHub Pages（主站） | https://devcelvin.github.io/arena-cn/ | 全球可访问，数据每日更新 |

数据健康状态实时可查：[/data/status.json](https://devcelvin.github.io/arena-cn/data/status.json)（`stale: false` 表示数据新鲜）。

**两种时间不要混淆**：数据集对每个榜单都标注了 `leaderboard_publish_date`（排名与票数冻结于该日，各榜更新节奏不同，如文本榜 10-08、搜索榜 08-24、智能体榜 10-12），本站每榜的「数据日期」即取自该字段。「数据同步于」只是本站最近一次成功拉取的时间，只反映同步新旧，不代表源数据时间。

---

## 工作原理

```
HF 官方数据集（CC BY 4.0）· 13 个 subset 的 parquet，约 3MB
   │  GitHub Actions 每日 22:23（北京时间）拉取
   ▼
scripts/fetch-hf.mjs  下载 parquet → hyparquet 解析 → 按 category 拆分 → 归一化
   ▼
scripts/build-data.mjs 校验（6 重）→ 落库
   ▼
data/  （数据即代码，随 git 提交）
├── latest/{boardId}.json   站点唯一数据源（全部 59 榜，校验通过才覆盖）
├── snapshots/              滚动保留 45 天（**仅二级榜单**，三级类别不写快照）
├── history/{boardId}.jsonl 二级榜单 top50 趋势（追加式）
├── index.json              榜单目录（含 source / license 署名信息）
└── status.json             健康状态 / 数据新鲜度
   ▼  push 触发
web/ 静态站（零构建原生 HTML/CSS/JS，fetch 本地 JSON）
   ├─→ GitHub Pages（主站）
   └─→ Gitee Pages（国内镜像，需配 secrets 后自动同步）
```

### 改配置前必须先知道的两件事

1. **文本榜和视觉榜必须用 `*_style_control` 变体**——数据集里 `text` / `vision` 与 `text_style_control` / `vision_style_control` 的数值**不同**；与源站榜单页默认展示一致的是后者（实测 top1 偏差 0.0）。搜索榜、文档榜则相反，用普通版。
2. **`agent` subset 字段名不同**——用 `score` / `score_ci_lower` / `score_ci_upper` / `session_count`，其余 subset 用 `rating` / `rating_lower` / `rating_upper` / `vote_count`。

---

## 目录结构

```
arena-cn/
├── .github/workflows/
│   ├── daily-fetch.yml     # 每日同步 + 提交数据（name: Daily Sync）
│   └── deploy.yml          # 部署 GitHub Pages + Gitee 镜像
├── scripts/
│   ├── boards.config.mjs   # ★ 榜单清单 + 数据源常量（增删榜单只改这里）
│   ├── fetch-hf.mjs        # 拉取 HF parquet → 归一化中间文件
│   ├── org-map.mjs         # 厂商中文映射 + 国产集合 + 大小写归一化
│   ├── build-data.mjs      # 校验 + 落库编排
│   ├── validate.mjs        # 6 重校验
│   ├── cleanup.mjs         # 45 天滚动清理
│   ├── sync-web-data.mjs   # 数据 → web/data（部署用）
│   ├── check-data.mjs      # 部署前体检
│   └── smoke-test.mjs      # 前端冒烟测试（DOM 桩，无需浏览器）
├── data/                   # 脚本生成，禁止手改
├── web/
│   ├── index.html          # 单页：三级联动选择器 + 榜单（?b=chat-text-math 可深链）
│   ├── 404.html
│   └── assets/             # style.css / app.js
├── package.json            # 唯一依赖：hyparquet（解析 parquet）
└── README.md
```

## 本地开发

```bash
npm install                    # 只装 hyparquet
npm run fetch                  # 拉取数据集（需要网络）
npm run build                  # 校验 + 落库
npm run sync                   # 同步到 web/data
npm run smoke                  # 前端冒烟测试
cd web && python -m http.server 8765   # http://127.0.0.1:8765
```

## 上线步骤（一次性）

1. **GitHub 建公开仓库**（公开 = Actions 免费无限时长 + Pages 免费的前提）
2. 推送代码后开启 Pages：Settings → Pages → Source 选 **GitHub Actions**（不是分支！）
3. 手动跑一次验证：Actions → Daily Sync → Run workflow
4. **（可选）Gitee 国内镜像**：Gitee 实名 → 建公开仓库 → 开启 Pages → 在 GitHub 仓库 Settings → Secrets 添加 `GITEE_USERNAME` / `GITEE_PASSWORD` / `GITEE_REPO`

> **仓库名提示**：仓库名 `arena-cn` 沿用自早期版本。若想彻底避开商标关联，可改名为 `leaderboard-cn` 之类——但 Pages URL、Gitee 镜像配置与已有外链都要跟着改，需自行权衡。

---

## 与"抓网页"版本的字段差异

数据集字段：`model_name` / `organization` / `license` / `rating` / `rating_lower` / `rating_upper` / `variance` / `vote_count` / `rank` / `category` / `leaderboard_publish_date`。

| 项 | 说明 |
| --- | --- |
| **价格、上下文长度** | 数据集**没有**这两个字段，相关排序与列已移除，改为展示数据集自带的「开源协议」 |
| **总票数** | 数据集未给出官方「榜单总票数」，不做推算，页面不再展示该字段 |
| **全球累计对战数** | 数据集无此统计，已移除 |
| **智能体细分榜** | 数据集只有 `overall`，原「编程 / 对话 / 工作 / 意图对齐」榜无对应数据，已下线 |
| **图像编辑细分榜** | 数据集只有 overall 与 multi_image_edit，原单图/多图 × 各风格共 15 个细分榜无对应数据，已下线 |
| **Web 开发细分榜** | 数据集只有 overall / html / react，原其余 8 个细分榜无对应数据，已下线 |

被下线榜单不是永久丢失：LMArena 若把更多 category 加进数据集，只需在 `scripts/boards.config.mjs` 里补一行即可恢复。

## 常见问题

- **cron 没准时跑？** GitHub 高峰时段 scheduled workflow 可能延迟几分钟到几小时，一日一次无影响；可手动 Run workflow 补跑。
- **数据集改版导致解析失败？** 全部榜单校验失败时保留旧数据 + 邮件告警；修 `scripts/fetch-hf.mjs` 后手动跑一次 Daily Sync 即可恢复。
- **想增删榜单？** 只改 `scripts/boards.config.mjs`（每个榜单一条配置），提交后次日生效。
- **为什么某榜分数和我在别处看到的不一样？** 先确认是不是 `style_control` 口径差异，见上文「改配置前必须先知道的两件事」。

## 路线图

- **P1**：模型详情页 + 30 天趋势图（history 数据已就绪）、排名涨跌红绿显示、Gitee 镜像调优
- **P2**：开源协议筛选（Proprietary / Apache / MIT…）、人民币换算、告警 webhook、模型对比
