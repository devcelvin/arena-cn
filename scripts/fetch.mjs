/**
 * fetch.mjs — 抓取 arena.ai 榜单页
 * 输出：.tmp/raw/{YYYY-MM-DD}/{pageId}.html
 * 策略：并发 3、单页超时 30s、指数退避重试 3 次、UA 标识
 * 退出码：全部失败 → 1；至少一页成功 → 0
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { PAGES, SOURCE_BASE, UA } from './boards.config.mjs';

const CONCURRENCY = 3;
const TIMEOUT_MS = 30_000;
const RETRIES = 3;

const today = new Date().toISOString().slice(0, 10);
const outDir = new URL(`../.tmp/raw/${today}/`, import.meta.url);

async function fetchOne(page) {
  const url = SOURCE_BASE + page.url;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 10_000) throw new Error(`页面过小（${html.length}B），疑似被拦截`);
      const file = new URL(`${page.id}.html`, outDir);
      await writeFile(file, html, 'utf8');
      return { page: page.id, ok: true, bytes: html.length };
    } catch (err) {
      if (attempt === RETRIES) {
        return { page: page.id, ok: false, error: String(err.message || err) };
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log(`[fetch] ${today} 抓取 ${PAGES.length} 个页面（并发 ${CONCURRENCY}）`);
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < PAGES.length) {
      const page = PAGES[cursor++];
      const r = await fetchOne(page);
      results.push(r);
      console.log(`  ${r.ok ? '✓' : '✗'} ${r.page} ${r.ok ? `${(r.bytes / 1024).toFixed(0)}KB` : r.error}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ok = results.filter((r) => r.ok).length;
  console.log(`[fetch] 完成：${ok}/${PAGES.length} 成功`);
  if (ok === 0) {
    console.error('[fetch] 全部失败，退出码 1');
    process.exit(1);
  }
}

main();
