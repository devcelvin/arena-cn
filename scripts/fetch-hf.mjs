/**
 * fetch-hf.mjs — 抓取 LMArena 官方 Hugging Face 榜单数据集（CC BY 4.0）
 *
 * 取代原 fetch.mjs（抓 arena.ai 页面，违反其 ToS §5 vi/vii/i/v）。
 * 数据源：https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset  CC BY 4.0
 *
 * 流程：HF parquet 直链下载 → hyparquet 解析 → 按 category 拆分为各榜单 → 归一化写中间文件
 * 输出：.tmp/raw/{YYYY-MM-DD}/{boardId}.json  → { models, dataDate, totalVotes }
 *
 * 字段差异：
 *   常规 subset：rating / rating_lower / rating_upper / vote_count
 *   agent subset：score / score_ci_lower / score_ci_upper / session_count
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parquetRead } from 'hyparquet';
import { SUBSETS, SOURCE, UA } from './boards.config.mjs';
import { orgCanonical } from './org-map.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const today = new Date().toISOString().slice(0, 10);
const outDir = `${ROOT}.tmp/raw/${today}/`;
const parquetDir = `${ROOT}.tmp/parquet/${today}/`;

const CONCURRENCY = 3;
const TIMEOUT_MS = 60_000;
const RETRIES = 3;

const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

/** 按量纲保留精度：BT 相对分值（|x|<=1）保留 3 位，ELO 保留 1 位 */
const fmtScore = (x) => (x == null ? null : Math.abs(x) <= 1 ? round3(x) : round1(x));

function readParquet(ab) {
  return new Promise((resolve, reject) => {
    try {
      parquetRead({
        file: ab,
        rowFormat: 'object',
        onComplete: resolve,
        onError: reject,
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function downloadConfig(config) {
  const url = `${SOURCE.parquetBase}/${config}/${SOURCE.split}/0.parquet`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 1000) throw new Error(`文件过小（${buf.byteLength}B），疑似异常响应`);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch (err) {
      if (attempt === RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

/** 取评分/区间/票数字段（两种 subset 字段名不同） */
function pickFields(row, variant) {
  if (variant === 'agent') {
    return {
      score: row.score,
      lower: row.score_ci_lower,
      upper: row.score_ci_upper,
      votes: row.session_count ?? row.observation_count ?? null,
    };
  }
  return {
    score: row.rating,
    lower: row.rating_lower,
    upper: row.rating_upper,
    votes: row.vote_count ?? null,
  };
}

/**
 * 把某个 subset 的某一 category 归一化成站点模型数组
 * rank 由 score 降序重算，保证严格升序无重复（校验规则 3 要求）
 */
function normalizeRows(rows, variant) {
  return rows
    .map((row) => {
      const { score, lower, upper, votes } = pickFields(row, variant);
      return {
        score: score == null ? null : Number(score),
        lower: lower == null ? null : Number(lower),
        upper: upper == null ? null : Number(upper),
        votes: votes == null ? null : Number(votes),
        name: String(row.model_name ?? '').trim(),
        org: orgCanonical(row.organization),
        license: row.license ?? null,
      };
    })
    .filter((m) => m.name && m.score != null)
    .sort((a, b) => b.score - a.score)
    .map((m, i) => ({
      rank: i + 1,
      rankUpper: null,  // HF 数据集未提供排名置信区间
      rankLower: null,
      key: m.name,      // HF 数据集无独立 modelKey，用模型名作稳定键
      name: m.name,
      org: m.org,
      score: fmtScore(m.score),
      scoreUpper: fmtScore(m.upper),
      scoreLower: fmtScore(m.lower),
      votes: m.votes,
      license: m.license,
      url: null,        // HF 数据集未提供模型主页
      inputPrice: null, // HF 数据集无价格字段（原站点价格来自抓取，已随换源移除）
      outputPrice: null,
      contextLength: null,
      pricePerImage: null,
      pricePerSecond: null,
      costPerTask: null,
      releaseType: null,
    }));
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(parquetDir, { recursive: true });

  const jobs = SUBSETS.map((s) => ({ subset: s }));
  console.log(`[fetch-hf] ${today} 抓取 ${jobs.length} 个 subset（并发 ${CONCURRENCY}）· 源 ${SOURCE.dataset} · ${SOURCE.license}`);

  let cursor = 0;
  let okBoards = 0;
  let failBoards = 0;
  const errors = [];

  async function worker() {
    while (cursor < jobs.length) {
      const { subset } = jobs[cursor++];
      try {
        const ab = await downloadConfig(subset.config);
        const rows = await readParquet(ab);
        for (const b of subset.boards) {
          const subsetRows = rows.filter((r) => r.category === b.cat);
          const models = normalizeRows(subsetRows, subset.variant);
          if (!models.length) {
            // 该 category 本次无数据 → 写空文件，由 build-data 判定失败并保留旧数据
            failBoards++;
            errors.push(`${b.id}：category「${b.cat}」无数据行`);
            console.log(`  ✗ ${b.id}（${b.name}）category=${b.cat} 无数据行`);
            continue;
          }
          const dataDate = String(subsetRows[0].leaderboard_publish_date ?? '').slice(0, 10) || null;
          await writeFile(
            `${outDir}${b.id}.json`,
            JSON.stringify({
              boardId: b.id,
              config: subset.config,
              category: b.cat,
              dataDate,
              // HF 数据集未给出官方「榜单总票数」字段，不做推算，避免显示误导性数字
              totalVotes: null,
              modelCount: models.length,
              models,
            }),
            'utf8'
          );
          okBoards++;
          console.log(`  ✓ ${b.id}（${b.name}）${models.length} 个模型 · 数据日期 ${dataDate ?? '未知'}`);
        }
      } catch (err) {
        failBoards += subset.boards.length;
        const msg = String(err.message || err);
        errors.push(`${subset.config}：${msg}`);
        console.log(`  ✗ ${subset.config}：${msg}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`[fetch-hf] 完成：${okBoards} 个榜单成功 / ${failBoards} 个失败`);
  if (okBoards === 0) {
    console.error('[fetch-hf] 全部失败，退出码 1');
    process.exit(1);
  }
}

main();
