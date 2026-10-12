/**
 * cleanup.mjs — 快照滚动清理 + 体积统计
 * 策略：snapshots/ 只保留最近 N 天（默认 45），每日 git rm 过期目录。
 * 算术：16 榜单约 560KB/天 → 45 天 ≈ 25MB，仓库常驻约 50MB，远离 1GB 软限。
 */
import { rm, readdir, stat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SNAP_DIR = `${ROOT}data/snapshots/`;

/** 删除 N 天前的快照目录，返回删除的天数 */
export async function cleanupSnapshots(retentionDays = 45) {
  let removed = 0;
  try {
    const entries = await readdir(SNAP_DIR);
    const cutoff = Date.now() - retentionDays * 86400_000;
    for (const name of entries) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
      const t = new Date(name + 'T00:00:00Z').getTime();
      if (t < cutoff) {
        await rm(`${SNAP_DIR}${name}`, { recursive: true, force: true });
        removed++;
      }
    }
  } catch {
    /* snapshots 目录不存在时忽略 */
  }
  return removed;
}

/** 递归统计目录体积（MB，保留 1 位小数） */
export async function dirSizeMB(dir) {
  let bytes = 0;
  const base = dir.endsWith('/') ? dir : dir + '/';
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        await walk(d + e.name + '/');
      } else {
        try {
          bytes += (await stat(d + e.name)).size;
        } catch { /* ignore */ }
      }
    }
  }
  await walk(base);
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

// 直接运行（node scripts/cleanup.mjs）时执行清理
const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === realpathSync(process.argv[1]).toLowerCase();
if (isMain) {
  const removed = await cleanupSnapshots(45);
  console.log(`[cleanup] 清理过期快照 ${removed} 天`);
}
