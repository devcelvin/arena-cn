/**
 * sync-web-data.mjs — 把 data/ 的站点数据拷贝到 web/data/（部署用）
 * 站点只读 web/data/ 下的静态 JSON，所有资源用相对路径，
 * 因此 GitHub Pages 根域名与 Gitee 子路径两种形态都能正常运行。
 */
import { rm, cp, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await rm(`${ROOT}web/data`, { recursive: true, force: true });
await mkdir(`${ROOT}web/data`, { recursive: true });
// 默认从 data-aa/ 同步（Artificial Analysis 为主源）；DATA_SOURCE=lmarena 回退旧源
const SRC = process.env.DATA_SOURCE === 'lmarena' ? 'data' : 'data-aa';
await cp(`${ROOT}${SRC}/latest`, `${ROOT}web/data/latest`, { recursive: true });
for (const f of ['index.json', 'status.json']) {
  if (await exists(`${ROOT}${SRC}/${f}`)) {
    await cp(`${ROOT}${SRC}/${f}`, `${ROOT}web/data/${f}`);
  }
}
console.log(`[sync-web-data] web/data 已更新（源：${SRC}）`);
