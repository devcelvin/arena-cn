/**
 * build-data.mjs — 数据流水线编排：归一化 → 校验 → 落库
 *
 * 输入：.tmp/raw/{today}/{boardId}.json（fetch-hf.mjs 产物，已归一化）
 * 数据源：HF lmarena-ai/leaderboard-dataset（CC BY 4.0）
 *
 * 输出：
 *   data/latest/{boardId}.json    站点唯一数据源（校验通过才覆盖）
 *   data/snapshots/{today}/{boardId}.json
 *   data/history/{boardId}.jsonl  二级榜单 top50 趋势（追加）
 *   data/index.json               榜单目录
 *   data/status.json              健康状态/新鲜度
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateBoard } from './validate.mjs';
import { cleanupSnapshots, dirSizeMB } from './cleanup.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const today = new Date().toISOString().slice(0, 10);

/**
 * 数据源切换：默认走 Artificial Analysis。
 * 回退到 LMArena（旧源）用 DATA_SOURCE=lmarena。
 * 两套配置各自独立，raw 与输出目录也分开，互不覆盖。
 */
const USE_AA = process.env.DATA_SOURCE !== 'lmarena';
const cfg = USE_AA
  ? await import('./boards.aa.config.mjs')
  : await import('./boards.config.mjs');
const BOARDS = cfg.BOARDS;
const SOURCE = cfg.SOURCE;
const rawDir = USE_AA ? `${ROOT}.tmp/raw-aa/${today}/` : `${ROOT}.tmp/raw/${today}/`;
// AA 模式写到独立目录：两套榜的 id 不同，但孤儿清理会误删对方的数据，必须物理隔离
const dataDir = USE_AA ? `${ROOT}data-aa/` : `${ROOT}data/`;

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function appendHistory(boardId, models) {
  const file = `${dataDir}history/${boardId}.jsonl`;
  await mkdir(`${dataDir}history`, { recursive: true });
  let existing = '';
  let lastDate = null;
  if (existsSync(file)) {
    existing = await readFile(file, 'utf8');
    const lines = existing.trim().split('\n').filter(Boolean);
    if (lines.length) {
      try {
        lastDate = JSON.parse(lines[lines.length - 1]).d;
      } catch { /* ignore */ }
    }
  }
  if (lastDate === today.slice(5)) return; // 当日已记录，幂等
  const md = today.slice(5); // MM-DD
  const lines = models.slice(0, 50).map((m) =>
    JSON.stringify({ d: md, k: m.key, r: m.rank, s: m.score, v: m.votes })
  );
  const prefix = existing && !existing.endsWith('\n') ? existing + '\n' : existing;
  await writeFile(file, prefix + lines.join('\n') + '\n', 'utf8');
}

async function main() {
  const boardStatus = {};
  const topModels = {};
  const boardDataDates = {};
  let okCount = 0;
  let failCount = 0;
  const nowIso = new Date().toISOString();

  for (const b of BOARDS) {
    const rawFile = `${rawDir}${b.id}.json`;
    const raw = await readJson(rawFile);

    if (!raw || !Array.isArray(raw.models) || raw.models.length === 0) {
      boardStatus[b.id] = { ok: false, error: '本轮抓取无数据（subset/category 缺失或下载失败）', warnings: [] };
      failCount++;
      console.log(`✗ ${b.id}：本轮无数据`);
      continue;
    }

    const models = raw.models;
    const prev = await readJson(`${dataDir}latest/${b.id}.json`);

    const { errors, warnings } = validateBoard({
      boardId: b.id,
      scale: b.scale,
      models,
      prev,
      // AA 的 LLM 端点无对战次数；text-to-speech 端点也只有 elo/rank/ci95，
      // 这两类跳过 votes 必填校验。其余媒体端点有 appearances，仍强制校验。
      votesOptional: USE_AA && (b.src === 'llm' || b.src === 'text-to-speech'),
    });
    if (errors.length) {
      boardStatus[b.id] = { ok: false, error: errors[0], warnings };
      failCount++;
      console.log(`✗ ${b.id}：${errors[0]}`);
      continue;
    }

    const dataDate = raw.dataDate ?? null;
    if (dataDate && (dataDate > today || new Date(dataDate).getTime() < Date.now() - 400 * 86400_000)) {
      console.log(`⚠ ${b.id}：数据日期 ${dataDate} 不在合理区间（未来或超过 400 天前），请人工复核`);
    }

    const boardJson = {
      meta: {
        boardId: b.id,
        name: b.name,
        group: b.group,
        scale: b.scale,
        fetchedAt: nowIso,
        dataDate,
        totalVotes: raw.totalVotes ?? null,
        modelCount: models.length,
        // CC BY 4.0 署名所需：源、许可证、许可证链接（页脚据此渲染署名块）
        source: SOURCE.publisher,
        sourceUrl: SOURCE.url,
        sourceConfig: raw.config ?? raw.src ?? null,
        license: SOURCE.license,
        licenseUrl: SOURCE.licenseUrl,
        // AA 榜的计量单位与口径说明，LMArena 榜为 null
        unit: raw.unit || null,
        note: b.note || null,
      },
      models,
    };

    await mkdir(`${dataDir}latest`, { recursive: true });
    await writeFile(`${dataDir}latest/${b.id}.json`, JSON.stringify(boardJson), 'utf8');

    if (models.length) {
      const t = models[0];
      topModels[b.id] = { name: t.name, org: t.org || '', score: t.score };
    }
    // 三级类别只出 latest：不写每日快照、不进趋势历史（否则文件数按类别数放大）
    if (b.snapshot) {
      await mkdir(`${dataDir}snapshots/${today}`, { recursive: true });
      await writeFile(`${dataDir}snapshots/${today}/${b.id}.json`, JSON.stringify(boardJson), 'utf8');
      await appendHistory(b.id, models);
    }

    boardStatus[b.id] = { ok: true, count: models.length, warnings };
    boardDataDates[b.id] = dataDate;
    okCount++;
    console.log(`✓ ${b.id}（${b.name}）${models.length} 个模型${warnings.length ? ` ⚠ ${warnings[0]}` : ''}`);
  }

  // index.json
  const index = {
    generatedAt: nowIso,
    source: { publisher: SOURCE.publisher, url: SOURCE.url, license: SOURCE.license, licenseUrl: SOURCE.licenseUrl },
    groups: [...new Set(BOARDS.map((b) => b.group))],
    boards: BOARDS.map((b) => {
      const st = boardStatus[b.id];
      return {
        id: b.id,
        name: b.name,
        group: b.group,
        scale: b.scale,
        parent: b.parent ?? null,
        isBoard: !b.parent,
        modelCount: st?.ok ? st.count : null,
        updatedAt: st?.ok ? nowIso : null,
        dataDate: st?.ok ? boardDataDates[b.id] ?? null : null,
        topModel: topModels[b.id] || null,
        unit: b.unit || null,
        note: b.note || null,
      };
    }),
  };
  if (okCount > 0) {
    await writeFile(`${dataDir}index.json`, JSON.stringify(index, null, 1), 'utf8');

    // 清理孤儿文件：换源后旧榜单（如图像编辑的 16 个细分榜）已下线，
    // latest 里的残留会跟着 sync-web-data 部署上线，必须清掉
    try {
      const valid = new Set(BOARDS.map((b) => b.id));
      for (const f of await readdir(`${dataDir}latest`)) {
        if (!f.endsWith('.json')) continue;
        const id = f.slice(0, -5);
        if (!valid.has(id)) {
          await rm(`${dataDir}latest/${f}`, { force: true });
          console.log(`[build-data] 清理孤儿文件 latest/${f}`);
        }
      }
      // 同步清理已下线榜单的 history
      if (existsSync(`${dataDir}history`)) {
        for (const f of await readdir(`${dataDir}history`)) {
          if (!f.endsWith('.jsonl')) continue;
          const id = f.slice(0, -6);
          if (!valid.has(id)) {
            await rm(`${dataDir}history/${f}`, { force: true });
            console.log(`[build-data] 清理孤儿文件 history/${f}`);
          }
        }
      }
    } catch { /* latest 不存在时忽略 */ }
  } else {
    console.warn('[build-data] 本次无榜单成功，保留上一次的 index.json');
  }

  // status.json
  const anyOk = okCount > 0;
  const prevStatus = await readJson(`${dataDir}status.json`);
  const lastSuccess = anyOk ? nowIso : prevStatus?.lastSuccess || null;
  const stale = !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > 3 * 86400_000;
  const status = {
    lastSuccess,
    lastAttempt: nowIso,
    stale,
    lastError: anyOk ? null : '本次全部榜单抓取/校验失败，页面展示上一次成功的数据',
    source: { publisher: SOURCE.publisher, url: SOURCE.url, license: SOURCE.license, licenseUrl: SOURCE.licenseUrl },
    boards: Object.fromEntries(BOARDS.map((b) => [b.id, boardStatus[b.id] || { ok: false, error: '未处理' }])),
    snapshotRetentionDays: 45,
    repoSizeMB: await dirSizeMB(dataDir),
  };
  await writeFile(`${dataDir}status.json`, JSON.stringify(status, null, 1), 'utf8');

  const removed = await cleanupSnapshots(45);
  status.repoSizeMB = await dirSizeMB(dataDir);
  await writeFile(`${dataDir}status.json`, JSON.stringify(status, null, 1), 'utf8');

  console.log(`\n[build-data] 成功 ${okCount} / 失败 ${failCount}；清理过期快照 ${removed} 天；${USE_AA ? 'data-aa' : 'data'}/ 体积 ${status.repoSizeMB}MB`);
  if (!anyOk) {
    console.error('[build-data] 本次无任何榜单成功，退出码 1（保留旧数据，触发告警邮件）');
    process.exit(1);
  }
}

main();
