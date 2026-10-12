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
await cp(`${ROOT}data/latest`, `${ROOT}web/data/latest`, { recursive: true });
for (const f of ['index.json', 'status.json', 'stats.json']) {
  if (await exists(`${ROOT}data/${f}`)) {
    await cp(`${ROOT}data/${f}`, `${ROOT}web/data/${f}`);
  }
}
console.log('[sync-web-data] web/data 已更新');
