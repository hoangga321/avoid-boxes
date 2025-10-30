// js/data/progress.js — SINGLE SOURCE (no duplicates)
const KEY = "avoidboxes.progress.v3"; // bump key để đảm bảo merge sạch

const DEFAULT = {
  coins: 0,
  xp: 0,
  unlocks: {
    // ==== PLAYER ====
    "skin.player.blue":       true,   // mặc định
    "skin.player.red":        false,
    "skin.player.panda":      false,
    // NEW
    "skin.player.yakuza":     false,
    "skin.player.superman":   false,

    // ==== OBSTACLE ====
    "skin.obstacle.pastel":   true,   // mặc định
    "skin.obstacle.neon":     false,
    "skin.obstacle.orc":      false,

    // Slime: dùng KEY CHUNG
    "skin.obstacle.slime":    false,

    // Giữ các biến thể để tương thích ngược (không dùng trong shop)
    "skin.obstacle.slime.green":  false,
    "skin.obstacle.slime.devil":  false,
    "skin.obstacle.slime.angel":  false
  },
  equip: {
    player:   "skin.player.blue",
    obstacle: "skin.obstacle.pastel",
  },

  achievements: {},
  dailies: [],
  weeklies: [],
  dailySeedAt: 0,
  weeklySeedAt: 0
};

// ---------- Core ----------
export function loadProgress(){
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : null;
    const p = deepMerge(structuredClone(DEFAULT), obj || {});

    // ===== Migration =====
    // 1) Nếu từng dùng KEY cũ, merge
    const prevKeys = ["avoidboxes.progress.v2","avoidboxes.progress"];
    for (const k of prevKeys){
      const r = localStorage.getItem(k);
      if (!r) continue;
      try {
        const o = JSON.parse(r);
        deepMerge(p, o);
      } catch {}
    }

    // 2) Nếu có bất kỳ biến thể slime đã sở hữu → bật slime chung
    const anySlimeOwned = !!(
      p.unlocks["skin.obstacle.slime.green"] ||
      p.unlocks["skin.obstacle.slime.devil"] ||
      p.unlocks["skin.obstacle.slime.angel"]
    );
    if (anySlimeOwned) p.unlocks["skin.obstacle.slime"] = true;

    // 3) Nếu đang equip bất kỳ biến thể slime → chuyển sang slime chung
    if (p.equip?.obstacle === "skin.obstacle.slime.green" ||
        p.equip?.obstacle === "skin.obstacle.slime.devil" ||
        p.equip?.obstacle === "skin.obstacle.slime.angel" ){
      p.equip.obstacle = "skin.obstacle.slime";
    }

    // 4) Nếu trước kia có id slime chung cũ → giữ nguyên
    if (p.unlocks && typeof p.unlocks["skin.obstacle.slime"] === "undefined"){
      p.unlocks["skin.obstacle.slime"] = false;
    }

    saveProgress(p);
    return p;
  } catch (e) {
    console.warn("progress load fail", e);
    return structuredClone(DEFAULT);
  }
}
export function saveProgress(p){
  try { localStorage.setItem(KEY, JSON.stringify(p)); }
  catch(e){ console.warn("progress save fail", e); }
}

export function addRewards(p, { coins=0, xp=0 }){
  p.coins = Math.max(0, Math.round((p.coins||0) + coins));
  p.xp    = Math.max(0, Math.round((p.xp||0) + xp));
  saveProgress(p);
  return p;
}
export function spendCoins(p, n){
  if (p.coins < n) return false;
  p.coins -= n; saveProgress(p); return true;
}
export function unlock(p, id){ p.unlocks[id] = true; saveProgress(p); return p; }
export function isUnlocked(p, id){ return !!p.unlocks[id]; }
export function equip(p, slot, id){ p.equip[slot] = id; saveProgress(p); return p; }

// ---------- Achievements ----------
export function achMark(p, id){
  if (!p.achievements[id]) p.achievements[id] = { unlocked:true, at:Date.now() };
  else p.achievements[id].unlocked = true;
  saveProgress(p); return true;
}
export function achIsUnlocked(p, id){ return !!(p.achievements[id]?.unlocked); }

// ---------- Daily / Weekly seeding ----------
export function ensureDailyWeekly(p){
  const now = Date.now();

  // Daily reset 00:00 local
  const dailyStart = startOfLocalDay(now);
  if (p.dailySeedAt !== dailyStart){
    p.dailySeedAt = dailyStart;
    p.dailies = [
      { id:"d.survive30", labelEN:"Survive 30 seconds",    labelKO:"30초 동안 생존",   goal:30,  prog:0, done:false, rewarded:false, reward:{coins:30,  xp:30} },
      { id:"d.near5",     labelEN:"Perform 5 near-misses", labelKO:"니어미스 5회",    goal:5,   prog:0, done:false, rewarded:false, reward:{coins:35,  xp:20} },
      { id:"d.clear1",    labelEN:"Clear 1 level",         labelKO:"레벨 1회 클리어", goal:1,   prog:0, done:false, rewarded:false, reward:{coins:25,  xp:25} },
    ];
  }

  // Weekly reset Monday 00:00 local
  const weeklyStart = startOfLocalWeek(now);
  if (p.weeklySeedAt !== weeklyStart){
    p.weeklySeedAt = weeklyStart;
    p.weeklies = [
      { id:"w.survive180", labelEN:"Survive 180 seconds (total)", labelKO:"총 180초 생존", goal:180, prog:0, done:false, rewarded:false, reward:{coins:120, xp:200} },
      { id:"w.near30",     labelEN:"Perform 30 near-misses",      labelKO:"니어미스 30회", goal:30,  prog:0, done:false, rewarded:false, reward:{coins:150, xp:150} },
    ];
  }

  // Chuẩn hoá dữ liệu cũ
  for (const arr of [p.dailies, p.weeklies]){
    if (!arr) continue;
    for (const m of arr){
      if (typeof m.rewarded === "undefined") m.rewarded = !!m.done;
      if (typeof m.prog !== "number") m.prog = 0;
      if (typeof m.goal !== "number") m.goal = 1;
    }
  }

  saveProgress(p);
  return p;
}

// NEW: Reset
export function resetProgress({ hard=false } = {}){
  if (hard){
    try { localStorage.removeItem(KEY); } catch(e){}
    return structuredClone(DEFAULT);
  } else {
    const fresh = structuredClone(DEFAULT);
    saveProgress(fresh);
    return fresh;
  }
}

// ---------- Helpers ----------
function deepMerge(base, extra){
  for (const k in extra){
    if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k])){
      base[k] = deepMerge(base[k] || {}, extra[k]);
    } else {
      base[k] = extra[k];
    }
  }
  return base;
}
function startOfLocalDay(ms){
  const d = new Date(ms);
  d.setHours(0,0,0,0);
  return d.getTime();
}
function startOfLocalWeek(ms){
  const d = new Date(ms);
  const day = d.getDay();              // 0=Sun..6=Sat
  const diff = (day===0 ? -6 : 1-day); // về thứ 2
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d.getTime();
}
