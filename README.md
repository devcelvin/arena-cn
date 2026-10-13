# AI Arena 中文榜单（arena-cn）

[arena.ai](https://arena.ai/leaderboard)（原 LMSYS Chatbot Arena）全球 AI 模型对战榜单的**国内版镜像站**：每日自动抓取榜单数据，全中文界面，国内可访问，**全程零成本**（GitHub Actions + GitHub Pages + Gitee Pages 免费层，无服务器、无数据库、无构建步骤）。

当前覆盖 **87 个榜单**，严格对齐源站的**三级分类**（依据 arena.ai 的 sitemap.xml + 各榜单页实际结构）：

- **一级 · 大类**：智能体 / 对话 / 代码 / 图像 / 视频
- **二级 · 榜单**（13 个）：能力榜、对齐榜（以上属智能体）、文本对话榜、视觉问答榜、文档理解榜、联网搜索榜、Web 开发榜、图像转网页榜、文生图榜、图像编辑榜、文生视频榜、图生视频榜、视频编辑榜
- **三级 · 类别**（74 个）：随榜单联动，如文本对话榜下 28 个（中文、数学、代码、创意写作、指令遵循、各语种、各行业…）、图像编辑榜下 16 个（单图/多图 × 各风格）、Web 开发榜下 11 个、视觉问答榜下 9 个、文生图榜下 7 个、智能体能力榜下 3 个（总榜 / 编程 / 工作）

> **智能体大类的特殊性**：源站把智能体分成「能力榜（Capabilities）」与「对齐榜（Alignment）」两块；能力榜左栏再分 Overall / Code / Chat / Work 四个类别。其中前三个（Overall/Code/Work）的数据来自源站首页内嵌数据，对齐榜是**独立量纲**（对齐指数，非 ELO/BT），数据取自源站首页 pill。**能力榜的 Chat 类别暂未收录** —— 该类别数据只在源站前端接口里（页面为客户端切换，SSR 不含），待补。

URL 形如 `/leaderboard/{大类}/{榜单}/{类别}`，界面按同样层级做三级联动切换。

## 在线地址

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| GitHub Pages（主站） | https://devcelvin.github.io/arena-cn/ | 全球可访问，数据每日更新 |
| Gitee Pages（国内镜像） | 待配置 | 需实名认证后填 3 个 secrets，见「上线步骤」第 4 步 |

数据健康状态实时可查：[/data/status.json](https://devcelvin.github.io/arena-cn/data/status.json)（`stale: false` 表示数据新鲜）。

**两种时间不要混淆**：源站对每个榜单都标注了「数据日期」（排名与票数冻结于该日，各榜不同，如文本榜 10-08、搜索榜 08-24、智能体总榜 10-12），本站每榜的「数据日期」即取自源站 —— 绝大多数榜单取页头标注（`<span>Oct 8, 2026</span>`）；智能体三榜取自 `/leaderboard/agent` 页头标注（源站 2026-10-13 起不再在首页 pill 里带 `trends` 序列，故改由此处取；更早的实现是取 pill 的 `trends` 末点 `cutoffTime`，该逻辑仍保留为优先路径）。「镜像抓取于」只是本站最近一次成功抓取的时间，只反映镜像新旧，不代表源站数据时间。两者都取不到时才退回显示抓取时间。

## 工作原理

```
arena.ai 84 个榜单页（服务端渲染内嵌全量 JSON，三级结构取自 sitemap）
   │  GitHub Actions 每日 22:23（北京时间）抓取，约 80MB
   ▼
scripts/ 解析（RSC payload → brace-matching）→ 6 重校验 → 归一化
   ▼
data/  （数据即代码，随 git 提交）
├── latest/{boardId}.json   站点唯一数据源（全部 84 榜，校验通过才覆盖）
├── snapshots/              滚动保留 45 天（**仅二级榜单**，三级类别不写快照）
├── history/{boardId}.jsonl 二级榜单 top50 趋势（追加式）
├── index.json              榜单目录（含每榜 group / parent / dataDate / totalVotes）
└── status.json             健康状态 / 数据新鲜度
   ▼  push 触发
web/ 静态站（零构建原生 HTML/CSS/JS，fetch 本地 JSON）
   ├─→ GitHub Pages（主站）
   └─→ Gitee Pages（国内镜像，需配 secrets 后自动同步）
```

## 目录结构

```
arena-cn/
├── .github/workflows/
│   ├── daily-fetch.yml     # 每日抓取 + 提交数据
│   └── deploy.yml          # 部署 GitHub Pages + Gitee 镜像
├── scripts/
│   ├── boards.config.mjs   # ★ 榜单清单（增删榜单只改这里）
│   ├── org-map.mjs         # 厂商中文映射 + 国产集合
│   ├── fetch.mjs           # 抓取（并发 3 / 重试 3 / UA 标识）
│   ├── parse.mjs           # RSC payload 解析器（技术核心）
│   ├── validate.mjs        # 6 重校验
│   ├── build-data.mjs      # 归一化落库编排
│   ├── cleanup.mjs         # 45 天滚动清理
│   ├── sync-web-data.mjs   # 数据 → web/data（部署用）
│   ├── check-data.mjs      # 部署前体检
│   └── smoke-test.mjs      # 前端冒烟测试（开发用）
├── data/                   # 脚本生成，禁止手改
├── web/
│   ├── index.html          # 单页：三级联动选择器 + 榜单（?b=chat-text-math 可深链）
│   ├── 404.html
│   └── assets/             # style.css / app.js
└── README.md
```

## 本地开发

```bash
node scripts/fetch.mjs        # 抓取（需要网络）
node scripts/build-data.mjs   # 解析 + 校验 + 落库
node scripts/sync-web-data.mjs
node scripts/smoke-test.mjs   # 前端冒烟测试（DOM 桩，无需浏览器）
cd web && python -m http.server 8765   # http://127.0.0.1:8765
```

> **本地抓取注意**：`fetch.mjs` 走 Node fetch，住宅 IP 高频请求后会被源站 Cloudflare 拦成 403（HTML 过小直接判失败）；GitHub Actions 的出口 IP 不受影响。本地验证可改用 `curl -A "ArenaCN-Bot/1.0"` 逐页抓取（URL 清单可从 `boards.config.mjs` 导出）。

## 上线步骤（一次性，约 10 分钟）

1. **GitHub 建公开仓库** `arena-cn`（公开 = Actions 免费无限时长 + Pages 免费的前提）
2. 推送代码：
   ```bash
   cd arena-cn
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/arena-cn.git
   git push -u origin main
   ```
3. **开启 Pages**：仓库 Settings → Pages → Source 选 **GitHub Actions**（不是分支！）
4. 手动跑一次验证：Actions → Daily Fetch → Run workflow → 完成后自动部署，访问 `https://<用户名>.github.io/arena-cn/`
5. **（可选）Gitee 国内镜像**：Gitee 账号实名 → 建公开仓库（建议 `用户名.gitee.io`）→ 开启 Pages 服务 → 在 GitHub 仓库 Settings → Secrets 添加 `GITEE_USERNAME` / `GITEE_PASSWORD`（Gitee 登录密码或私人令牌）/ `GITEE_REPO`（`用户名/仓库名`）。之后每日数据更新会自动同步到 Gitee Pages。

## 数据说明与免责声明

- 数据来源为 arena.ai 公开榜单页面（robots.txt 允许抓取 `/leaderboard*`），本站每日抓取一次（84 页，约 80MB），做中文化整理后静态呈现，**仅供学习参考，与官方无关；排名与评分版权归原站所有**。
- 两种评分量纲：**ELO 评分**（对话/代码/图像/视频榜，相对战力分）与 **BT 相对战力值**（智能体榜，0 = 平均水平，按百分比展示）。
- 价格为每百万 token 美元计价（智能体榜为单任务成本），来自 arena.ai 公开字段，可能大量缺失（显示 —）。
- 厂商英文名为准，中文名为整理者附加标注；金色"国产"徽章为整理者判断。
- 抓取失败时**不会覆盖旧数据**，页面会显示"数据可能过期"横幅，同时 GitHub 会发告警邮件到账户邮箱。

## 常见问题

- **cron 没准时跑？** GitHub 高峰时段 scheduled workflow 可能延迟几分钟到几小时，一日一次无影响；可手动 Run workflow 补跑。
- **arena.ai 改版导致解析失败？** 全部榜单校验失败时保留旧数据 + 邮件告警；修 `scripts/parse.mjs` 后手动跑一次 Daily Fetch 即可恢复。
- **想增删榜单？** 只改 `scripts/boards.config.mjs`（每个页面一条配置），提交后次日生效。
- **榜单页是客户端渲染、抓不到怎么办？** 图像编辑榜首页属此列，但它的 16 个子类别页有服务端渲染数据 —— 三级结构下该榜的数据由子类别提供，故已收录（首页自身在配置里标为 `container`，只为三级树保留位置，不抓取、无自有数据）。

## 路线图

- **P1**：模型详情页 + ECharts 30 天趋势图（history 数据已就绪）、排名涨跌红绿显示、Gitee 镜像调优
- **P2**：人民币换算（免费汇率源）、第三方兜底数据源自动切换、告警 webhook、逆向完整 Agent 榜、模型对比
