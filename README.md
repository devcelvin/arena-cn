# AI Arena 中文榜单（arena-cn）

[arena.ai](https://arena.ai/leaderboard)（原 LMSYS Chatbot Arena）全球 AI 模型对战榜单的**国内版镜像站**：每日自动抓取榜单数据，全中文界面，国内可访问，**全程零成本**（GitHub Actions + GitHub Pages + Gitee Pages 免费层，无服务器、无数据库、无构建步骤）。

当前覆盖 **19 个榜单**：智能体总榜 / 编程智能体榜 / 对齐偏好智能体榜、文本对话总榜、**中文对话榜**、代码能力榜、数学能力榜、创意写作榜、指令遵循榜、视觉问答榜、中文视觉榜、文档理解榜、联网搜索榜、Web 开发榜、图像转网页榜、文生图榜、文生视频榜、图生视频榜、视频编辑榜。

## 在线地址

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| GitHub Pages（主站） | https://devcelvin.github.io/arena-cn/ | 全球可访问，数据每日更新 |
| Gitee Pages（国内镜像） | 待配置 | 需实名认证后填 3 个 secrets，见「上线步骤」第 4 步 |

数据健康状态实时可查：[/data/status.json](https://devcelvin.github.io/arena-cn/data/status.json)（`stale: false` 表示数据新鲜）。

## 工作原理

```
arena.ai 19 个榜单页（服务端渲染内嵌全量 JSON）
   │  GitHub Actions 每日 22:23（北京时间）抓取，约 20MB
   ▼
scripts/ 解析（RSC payload → brace-matching）→ 6 重校验 → 归一化
   ▼
data/  （数据即代码，随 git 提交）
   ├── latest/{boardId}.json   站点唯一数据源（校验通过才覆盖）
   ├── snapshots/              滚动保留 45 天
   ├── history/{boardId}.jsonl 每榜 top50 趋势（追加式）
   ├── index.json              榜单目录
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
│   ├── index.html          # 首页
│   ├── board.html          # 榜单页（?b=text-chinese）
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

- 数据来源为 arena.ai 公开榜单页面（robots.txt 允许抓取 `/leaderboard*`），本站每日抓取一次（约 20MB），做中文化整理后静态呈现，**仅供学习参考，与官方无关；排名与评分版权归原站所有**。
- 两种评分量纲：**ELO 评分**（对话/代码/图像/视频榜，相对战力分）与 **BT 相对战力值**（智能体榜，0 = 平均水平，按百分比展示）。
- 价格为每百万 token 美元计价（智能体榜为单任务成本），来自 arena.ai 公开字段，可能大量缺失（显示 —）。
- 厂商英文名为准，中文名为整理者附加标注；金色"国产"徽章为整理者判断。
- 抓取失败时**不会覆盖旧数据**，页面会显示"数据可能过期"横幅，同时 GitHub 会发告警邮件到账户邮箱。

## 常见问题

- **cron 没准时跑？** GitHub 高峰时段 scheduled workflow 可能延迟几分钟到几小时，一日一次无影响；可手动 Run workflow 补跑。
- **arena.ai 改版导致解析失败？** 全部榜单校验失败时保留旧数据 + 邮件告警；修 `scripts/parse.mjs` 后手动跑一次 Daily Fetch 即可恢复。
- **想增删榜单？** 只改 `scripts/boards.config.mjs`（每个页面一条配置），提交后次日生效。
- **图像编辑榜 / 完整 Agent 榜为什么没有？** 这两个页面是客户端渲染，HTML 无数据，需逆向前端接口（P2 计划）。

## 路线图

- **P1**：模型详情页 + ECharts 30 天趋势图（history 数据已就绪）、排名涨跌红绿显示、Gitee 镜像调优
- **P2**：人民币换算（免费汇率源）、第三方兜底数据源自动切换、告警 webhook、逆向完整 Agent 榜、模型对比
