/**
 * parse.mjs — arena.ai 页面解析器（技术核心）
 *
 * arena.ai 无公开 API，但每个榜单页把全量数据以 JSON 形式
 * 内嵌在 Next.js RSC payload（self.__next_f.push）中，且为转义形态。
 *
 * 两步解析：
 *   ① extractRscText：抽取所有 push([1,"..."]) 的字符串字面量并反转义，拼接为大文本
 *      （模型对象可能跨 chunk，必须先拼接再扫描）
 *   ② extractModelObjects：以 {"rank": 为锚点做 brace-matching 平衡扫描，
 *      三态机（esc/inStr/depth）跳过字符串内的引号与转义，截出完整对象再 JSON.parse
 *      （实测简单正则会漏约 1% 跨行/含特殊字符对象，此方案全覆盖）
 */

/** 从 HTML 中提取并反转义全部 RSC 文本 */
export function extractRscText(html) {
  const marker = 'self.__next_f.push([1,';
  const chunks = [];
  let searchFrom = 0;
  for (;;) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) break;
    let i = idx + marker.length;
    if (html[i] !== '"') {
      searchFrom = idx + marker.length;
      continue;
    }
    i++;
    let str = '';
    let closed = false;
    while (i < html.length) {
      const c = html[i];
      if (c === '\\') {
        const next = html[i + 1];
        if (next === 'u') {
          const code = parseInt(html.slice(i + 2, i + 6), 16);
          if (Number.isNaN(code)) {
            str += next;
            i += 2;
          } else {
            str += String.fromCharCode(code);
            i += 6;
          }
        } else {
          const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/', "'": "'" };
          str += map[next] ?? next;
          i += 2;
        }
      } else if (c === '"') {
        closed = true;
        break;
      } else {
        str += c;
        i++;
      }
    }
    if (closed) chunks.push(str);
    searchFrom = i;
  }
  return chunks.join('');
}

/** 从 start 处的 '{' 开始做平衡扫描，返回完整对象子串（失败返回 null） */
function scanBalanced(text, start) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * 提取所有模型对象（以 {"rank": 为锚点）。
 * 返回原始对象数组（arena.ai 原始字段名）。
 */
export function extractModelObjects(rscText) {
  const needle = '{"rank":';
  const results = [];
  let idx = 0;
  while ((idx = rscText.indexOf(needle, idx)) !== -1) {
    const objStr = scanBalanced(rscText, idx);
    if (objStr) {
      try {
        const obj = JSON.parse(objStr);
        if (obj && typeof obj === 'object' && obj.modelKey && obj.modelDisplayName) {
          results.push(obj);
        }
      } catch {
        /* 跳过无法解析的对象 */
      }
    }
    idx += needle.length;
  }
  return results;
}

/**
 * 提取主页的 Agent 列表组（按 rank 重置切分）。
 * 主页内嵌 3 组 53 条的 Agent 榜单（最佳综合/最佳编程/对齐偏好），
 * 通过对象中是否含 costPerTaskUsd 字段识别 Agent 类对象。
 * 返回 [[...], [...], [...]]，顺序与页面板块一致。
 */
export function extractAgentLists(rscText) {
  const agentObjs = extractModelObjects(rscText).filter((o) => 'costPerTaskUsd' in o);
  const groups = [];
  let cur = [];
  let prevRank = 0;
  for (const o of agentObjs) {
    const r = Number(o.rank);
    if (r <= prevRank && cur.length) {
      groups.push(cur);
      cur = [];
    }
    cur.push(o);
    prevRank = r;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/** 提取主页全局会话统计 */
export function extractSessionStats(rscText) {
  const m = rscText.match(/"sessionCount":(\d+),"sessionsLastHour":(\d+),"newestSessionAt":"([^"]+)"/);
  if (!m) return null;
  return {
    sessionCount: Number(m[1]),
    sessionsLastHour: Number(m[2]),
    newestSessionAt: m[3],
  };
}

/**
 * 提取榜单页头部统计（服务端渲染部分，不在 RSC payload 里）：
 *   数据日期：<span>Oct 8, 2026</span>（时钟图标旁，源站对该榜数据时间的标注）
 *   总票数：<span>8,734,330<!-- --> <!-- -->votes</span>
 *
 * 这个日期才是榜单的数据时间：源站的排名与票数冻结于该日
 * （实测跨日抓取票数一字不变），抓取时间只反映镜像新旧。
 * 主页（Agent 三榜）与 image-edit 页无此结构，字段返回 null。
 *
 * 已实测 16 个分类页各自均只有 1 处匹配，模式唯一。
 */
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

export function extractBoardStats(html) {
  const dm = html.match(/<span>([A-Z][a-z]{2}) (\d{1,2}), (\d{4})<\/span>/);
  const vm = html.match(/<span>([\d,]+)<!-- --> <!-- -->votes<\/span>/);
  let dataDate = null;
  if (dm) {
    const mon = MONTHS[dm[1]];
    if (mon) dataDate = `${dm[3]}-${String(mon).padStart(2, '0')}-${String(dm[2]).padStart(2, '0')}`;
  }
  return {
    dataDate,
    totalVotes: vm ? Number(vm[1].replace(/,/g, '')) : null,
  };
}

/** 页面总入口：分类页 → 模型数组；主页 → { agentLists, session } */
export function parsePage(html) {
  const text = extractRscText(html);
  if (!text) return { ok: false, error: 'RSC payload 为空（页面结构可能已变化）' };
  return { ok: true, rscText: text };
}
