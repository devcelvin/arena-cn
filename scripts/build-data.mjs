/**
 * build-data.mjs — 数据流水线编排：解析 → 归一化 → 校验 → 落库
 *
 * 输入：.tmp/raw/{today}/{pageId}.html（fetch.mjs 产物）
 * 输出：
 *   data/latest/{boardId}.json    站点唯一数据源（全量，校验通过才覆盖）
 *   data/snapshots/{today}/{boardId}.json
 *   data/history/{boardId}.jsonl  每榜 top50 趋势（追加）
 *   data/index.json               榜单目录
 *   data/status.json              健康状态/新鲜度
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAGES, BOARDS } from './boards.config.mjs';
import { parsePage, extractModelObjects, extractAgentLists, extractSessionStats } from './parse.mjs';
import { validateBoard, validateSession } from './validate.mjs';
import { cleanupSnapshots, dirSizeMB } from './cleanup.mjs';
import { isCN } from './org-map.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const today = new Date().toISOString().slice(0, 10);
const rawDir = `${ROOT}.tmp/raw/${today}/`;
const dataDir = `${ROOT}data/`;

const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

/** arena.ai 原始对象 → 站点紧凑模型 */
function normalize(raw) {
  // ELO 量纲（>800）保留 1 位小数；BT 相对分值（|x|<=1）保留 3 位，前端按百分比展示
  const r = (x) => (x == null ? null : Math.abs(x) <= 1 ? round3(x) : round1(x));
  return {
    rank: raw.rank,
    rankUpper: raw.rankUpper ?? null,
    rankLower: raw.rankLower ?? null,
    key: raw.modelKey,
    name: raw.modelDisplayName,
    org: raw.modelOrganization ?? '',
    score: r(raw.rating),
    scoreUpper: r(raw.ratingUpper),
    scoreLower: r(raw.ratingLower),
    votes: raw.votes ?? null,
    license: raw.license ?? null,
    url: raw.modelUrl ?? null,
    inputPrice: raw.inputPricePerMillion ?? null,
    outputPrice: raw.outputPricePerMillion ?? null,
    contextLength: raw.contextLength ?? null,
    pricePerImage: raw.pricePerImage ?? null,
    pricePerSecond: raw.pricePerSecond ?? null,
    costPerTask: raw.costPerTaskUsd ?? null,
    releaseType: raw.releaseType ?? null,
  };
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function appendHistory(boardId, models) {
  const file = `${dataDir}history/${boardId}.jsonl`;
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
  const topModels = {};        // { boardId: {name, org, score} } 供首页宫格展示
  const seenKeys = new Set();  // 全站去重（同一模型会同时出现在多个榜）
  const orgSet = new Set();
  let cnModels = 0;
  let okCount = 0;
  let failCount = 0;
  const nowIso = new Date().toISOString();

  for (const page of PAGES) {
    const rawFile = `${rawDir}${page.id}.html`;
    if (!existsSync(rawFile)) {
      for (const b of page.boards) {
        boardStatus[b.id] = { ok: false, error: '原始页面缺失（抓取失败）', warnings: [] };
        failCount++;
      }
      console.log(`✗ ${page.id}：原始页面缺失`);
      continue;
    }

    const html = await readFile(rawFile, 'utf8');
    const parsed = parsePage(html);
    if (!parsed.ok) {
      for (const b of page.boards) {
        boardStatus[b.id] = { ok: false, error: parsed.error, warnings: [] };
        failCount++;
      }
      console.log(`✗ ${page.id}：${parsed.error}`);
      continue;
    }

    let session = null;
    let agentLists = null;
    if (page.kind === 'home') {
      agentLists = extractAgentLists(parsed.rscText);
      session = extractSessionStats(parsed.rscText);
      if (agentLists.length !== 3) {
        console.log(`⚠ home：Agent 列表组数 = ${agentLists.length}（预期 3），按顺序映射`);
      }
    }

    for (const b of page.boards) {
      const rawModels =
        page.kind === 'home'
          ? (agentLists[b.listIndex] || [])
          : extractModelObjects(parsed.rscText);
      const models = rawModels.map(normalize);
      const prev = await readJson(`${dataDir}latest/${b.id}.json`);

      const { errors, warnings } = validateBoard({
        boardId: b.id,
        scale: b.scale,
        models,
        prev,
      });

      if (errors.length) {
        boardStatus[b.id] = { ok: false, error: errors[0], warnings };
        failCount++;
        console.log(`✗ ${b.id}：${errors[0]}`);
        continue;
      }

      const boardJson = {
        meta: {
          boardId: b.id,
          name: b.name,
          group: b.group,
          scale: b.scale,
          fetchedAt: nowIso,
          sourceUrl: 'https://arena.ai' + page.url,
          modelCount: models.length,
        },
        models,
      };

      await mkdir(`${dataDir}latest`, { recursive: true });
      await writeFile(`${dataDir}latest/${b.id}.json`, JSON.stringify(boardJson), 'utf8');

      // 首页汇总统计（跨榜去重）
      for (const m of models) {
        if (m.key && !seenKeys.has(m.key)) {
          seenKeys.add(m.key);
          if (m.org) orgSet.add(m.org);
          if (isCN(m.org)) cnModels++;
        }
      }
      if (models.length) {
        const t = models[0];
        topModels[b.id] = { name: t.name, org: t.org || '', score: t.score };
      }
      await mkdir(`${dataDir}snapshots/${today}`, { recursive: true });
      await writeFile(`${dataDir}snapshots/${today}/${b.id}.json`, JSON.stringify(boardJson), 'utf8');
      await appendHistory(b.id, models);

      boardStatus[b.id] = { ok: true, count: models.length, warnings };
      okCount++;
      console.log(`✓ ${b.id}（${b.name}）${models.length} 个模型${warnings.length ? ` ⚠ ${warnings[0]}` : ''}`);
    }

    // 主页会话统计校验
    if (page.kind === 'home') {
      const prevStatus = await readJson(`${dataDir}status.json`);
      const sv = validateSession(session, prevStatus?.session || null);
      if (sv.errors.length) {
        console.log(`✗ session：${sv.errors[0]}`);
        boardStatus.__session = { ok: false, error: sv.errors[0] };
      } else {
        boardStatus.__session = { ok: true, session };
      }
    }
  }

  // index.json
  const index = {
    generatedAt: nowIso,
    groups: [...new Set(BOARDS.map((b) => b.group))],
    boards: BOARDS.map((b) => {
      const st = boardStatus[b.id];
      return {
        id: b.id,
        name: b.name,
        group: b.group,
        scale: b.scale,
        highlight: !!b.highlight,
        modelCount: st?.ok ? st.count : null,
        updatedAt: st?.ok ? nowIso : null,
        topModel: topModels[b.id] || null,
      };
    }),
  };
  await writeFile(`${dataDir}index.json`, JSON.stringify(index, null, 1), 'utf8');

  // stats.json —— 首页 KPI 概览（跨榜去重）
  const orgList = [...orgSet];
  const stats = {
    generatedAt: nowIso,
    boardCount: okCount,
    modelTotal: seenKeys.size,
    orgCount: orgList.length,
    cnOrgCount: orgList.filter(isCN).length,
    cnModelCount: cnModels,
  };
  await writeFile(`${dataDir}stats.json`, JSON.stringify(stats, null, 1), 'utf8');

  // status.json
  const anyOk = okCount > 0;
  const prevStatus = await readJson(`${dataDir}status.json`);
  const lastSuccess = anyOk ? nowIso : prevStatus?.lastSuccess || null;
  const stale = !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > 3 * 86400_000;
  const session = boardStatus.__session?.ok ? boardStatus.__session.session : prevStatus?.session || null;
  const status = {
    lastSuccess,
    lastAttempt: nowIso,
    stale,
    lastError: anyOk ? null : '本次全部榜单抓取/校验失败，页面展示上一次成功的数据',
    boards: Object.fromEntries(BOARDS.map((b) => [b.id, boardStatus[b.id] || { ok: false, error: '未处理' }])),
    session,
    snapshotRetentionDays: 45,
    repoSizeMB: await dirSizeMB(dataDir),
  };
  await writeFile(`${dataDir}status.json`, JSON.stringify(status, null, 1), 'utf8');

  // 滚动清理 + 体积报告
  const removed = await cleanupSnapshots(45);
  status.repoSizeMB = await dirSizeMB(dataDir);
  await writeFile(`${dataDir}status.json`, JSON.stringify(status, null, 1), 'utf8');

  console.log(`\n[build-data] 成功 ${okCount} / 失败 ${failCount}；清理过期快照 ${removed} 天；data/ 体积 ${status.repoSizeMB}MB`);
  if (!anyOk) {
    console.error('[build-data] 本次无任何榜单成功，退出码 1（保留旧数据，触发告警邮件）');
    process.exit(1);
  }
}

main();
