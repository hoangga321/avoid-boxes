// js/ui/leaderboard.js
const KEY = "avoidboxes.leaderboard.v1";

// ---------- helpers ----------
function loadRaw() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function saveRaw(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr || []));
}

// làm tròn điểm & time, tạo timeKey (1 chữ số thập phân) để dedupe ổn định
function normalizeRecord(rec) {
  const score  = Math.max(0, Math.floor(Number(rec.score || 0)));
  const t      = Math.max(0, Number(rec.timeSec || 0));
  const timeKey = Number(t.toFixed(1)); // dùng làm “khóa mềm”
  return {
    name: String(rec.name || "PLAYER").slice(0, 16),
    score,
    timeSec: t,
    timeKey,                // <— thêm trường phụ cho dedupe
    stageId: String(rec.stageId || ""),
    date: rec.date || Date.now(),
    runId: rec.runId || null
  };
}

export function loadBoard() {
  // khôi phục các record cũ không có timeKey
  const list = loadRaw().map(r => {
    if (typeof r.timeKey === "number") return r;
    const t = Math.max(0, Number(r.timeSec || 0));
    return { ...r, timeSec: t, timeKey: Number(t.toFixed(1)) };
  });
  // đồng bộ hoá storage nếu có thay đổi
  saveRaw(list);
  return list;
}

export function saveBoard(arr) { saveRaw(arr); }

// so sánh “mềm” cho time: coi là trùng nếu cùng timeKey hoặc |Δ| < 0.05s
function sameTupleSoft(a, b) {
  if (a.score !== b.score) return false;
  if (String(a.stageId) !== String(b.stageId)) return false;
  if (typeof a.timeKey === "number" && typeof b.timeKey === "number") {
    if (a.timeKey === b.timeKey) return true;
  }
  return Math.abs(Number(a.timeSec) - Number(b.timeSec)) < 0.05;
}

/**
 * Upsert Top10 (chống lưu trùng):
 * - Nếu có runId: thay thế bản cũ cùng runId.
 * - Nếu không: dedupe theo (score, stageId, timeKey) hoặc |Δtime|<0.05.
 * - Sort: score desc, rồi timeSec desc. Giữ Top10.
 */
export function addOrUpdateRecord(recIn) {
  const rec = normalizeRecord(recIn);
  const list = loadBoard();

  // 1) gỡ theo runId (nếu có)
  if (rec.runId) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].runId === rec.runId) list.splice(i, 1);
    }
  }

  // 2) dedupe mềm các bản không có runId (thường là “PLAYER”)
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    // chỉ xoá nếu bản cũ KHÔNG có runId (để không đụng tới record hợp lệ cũ)
    if (!it.runId && sameTupleSoft(it, rec)) {
      list.splice(i, 1);
    }
  }

  // 3) thêm mới
  list.push(rec);

  // 4) sort & keep top10
  list.sort((a, b) => (b.score - a.score) || (b.timeSec - a.timeSec));
  const top10 = list.slice(0, 10);
  saveRaw(top10);
  return top10;
}

/**
 * TƯƠNG THÍCH NGƯỢC:
 * Một số file vẫn gọi addRecord(). Giữ alias này:
 *  - addRecord({ name, score, timeSec, stageId, runId, date })
 *  - addRecord(name, score, timeSec, stageId, { runId, date })
 */
export function addRecord(arg1, score, timeSec, stageId, extra = {}) {
  if (arg1 && typeof arg1 === "object") {
    return addOrUpdateRecord(arg1);
  }
  return addOrUpdateRecord({
    name: arg1,
    score,
    timeSec,
    stageId,
    runId: extra.runId || null,
    date:  extra.date  || Date.now()
  });
}
