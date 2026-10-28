/**
 * check-org-sync.mjs — 厂商表双副本一致性检查（独立于数据源，任何时候都能跑）
 *
 * 背景：厂商表有两份真相源，只改一份线上不生效。
 *   构建侧：scripts/org-map.mjs
 *   前端侧：web/assets/app.js 顶部的手抄副本（浏览器无法 import Node 模块）
 * 2026-10-18 就因漏同步 Xiaomi 导致小米 MiMo 全系没标「国产」。
 *
 * 用法：node scripts/check-org-sync.mjs   （退出码 1 = 漂移）
 */
import { readFile } from 'node:fs/promises';
import { CN_ORGS as SRC_CN, ORG_ZH as SRC_ZH } from './org-map.mjs';

const code = await readFile(new URL('../web/assets/app.js', import.meta.url), 'utf8');

const zhMatch = code.match(/const ORG_ZH = (\{[\s\S]*?\n\});/);
const cnMatch = code.match(/const CN_ORGS = new Set\((\[[\s\S]*?\])\);/);

if (!zhMatch || !cnMatch) {
  console.error('✗ 无法从 app.js 提取 ORG_ZH / CN_ORGS，检查两处定义是否被改写');
  process.exit(1);
}

const CLIENT_ZH = eval(`(${zhMatch[1]})`);
const CLIENT_CN = new Set(eval(`(${cnMatch[1]})`));

let failed = 0;
const report = (name, pass, detail = '') => {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '：' + detail : ''}`);
  if (!pass) failed++;
};

const missCN = [...SRC_CN].filter((o) => !CLIENT_CN.has(o));
const extraCN = [...CLIENT_CN].filter((o) => !SRC_CN.has(o));
report(
  `CN_ORGS 同步（构建侧 ${SRC_CN.size} 家 / 前端 ${CLIENT_CN.size} 家）`,
  !missCN.length && !extraCN.length,
  missCN.length || extraCN.length ? `app.js 缺 ${missCN.join('/') || '—'}；多 ${extraCN.join('/') || '—'}` : ''
);

const missZh = Object.keys(SRC_ZH).filter((o) => !(o in CLIENT_ZH));
const diffZh = Object.keys(SRC_ZH).filter((o) => o in CLIENT_ZH && CLIENT_ZH[o] !== SRC_ZH[o]);
report(
  `ORG_ZH 同步（构建侧 ${Object.keys(SRC_ZH).length} 条 / 前端 ${Object.keys(CLIENT_ZH).length} 条）`,
  !missZh.length && !diffZh.length,
  missZh.length || diffZh.length ? `app.js 缺 ${missZh.join('/') || '—'}；译名不一致 ${diffZh.join('/') || '—'}` : ''
);

// 国产集合里的每个厂商都应有中文小注，否则表格里只有英文名
const noZh = [...SRC_CN].filter((o) => !SRC_ZH[o]);
report('国产厂商均有中文小注', noZh.length === 0, noZh.length ? `缺：${noZh.join('/')}` : '');

console.log(failed ? `\n${failed} 项不一致 ❌` : '\n厂商表一致 ✅');
process.exit(failed ? 1 : 0);
