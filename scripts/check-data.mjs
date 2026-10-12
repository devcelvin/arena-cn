/**
 * check-data.mjs — 部署前数据体检
 * 防止把没有数据的站点部署上线。任一不满足 → 退出码 1，阻断部署。
 */
import { access, readdir } from 'node:fs/promises';
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

const errors = [];

if (!(await exists(`${ROOT}web/data/latest`))) {
  errors.push('web/data/latest 不存在（未执行 sync-web-data.mjs）');
} else {
  const files = await readdir(`${ROOT}web/data/latest`);
  const jsons = files.filter((f) => f.endsWith('.json'));
  if (jsons.length < 5) errors.push(`latest 榜单文件过少（${jsons.length} 个）`);
}
if (!(await exists(`${ROOT}web/data/index.json`))) errors.push('web/data/index.json 不存在');

if (errors.length) {
  console.error('[check-data] ' + errors.join('；'));
  process.exit(1);
}
console.log('[check-data] 数据体检通过');
