import { initRenderer, onResize } from "./engine/renderer.js";
import { initInput }              from "./engine/input.js";
import { Game }                   from "./game/state.js";
import { HUD }                    from "./ui/hud.js";
import { Overlays }               from "./ui/overlays.js";
import { I18n }                   from "./ui/i18n.js";
import { AudioManager }           from "./engine/audio.js";
import { SettingsPanel }          from "./ui/settings.js";
import { STAGES }                 from "./game/stages.js";
import { MissionsPanel }          from "./ui/missions.js";
import { ShopPanel }              from "./ui/shop.js";
import { loadProgress, ensureDailyWeekly, resetProgress } from "./data/progress.js";

/* Leaderboard helpers */
import { loadBoard, saveBoard } from "./ui/leaderboard.js";

/* =========================================================
   App bootstrap
   ========================================================= */
const canvas = document.getElementById("gameCanvas");
const app = { canvas, ctx: canvas.getContext("2d"), logicWidth: 540, logicHeight: 720, dpr: window.devicePixelRatio || 1 };

const i18n = new I18n();
i18n.applyDOM();

initRenderer(app);
initInput(app);

/* =========================================================
   How-to (i18n)
   ========================================================= */
const langSelect = document.getElementById("langSelect");
langSelect && (langSelect.value = i18n.lang);

function renderHowto(i18nInst){
  const t = i18nInst.t.bind(i18nInst);
  const $title = document.getElementById("howtoTitle");
  const $body  = document.getElementById("howtoBody");
  if (!$title || !$body) return;

  $title.textContent = t("howto.title");
  $body.innerHTML = `
    <section class="howto-sec">
      <h3>🎯 ${t("howto.skills.title")}</h3>
      <ul class="howto-list">
        <li><b>1 = ${t("howto.skills.repel.name")}</b> — ${t("howto.skills.repel.desc")}</li>
        <li><b>2 = ${t("howto.skills.shield.name")}</b> — ${t("howto.skills.shield.desc")}</li>
        <li><b>3 = ${t("howto.skills.bomb.name")}</b> — ${t("howto.skills.bomb.desc")}</li>
        <li><b>4 = ${t("howto.skills.freeze.name")}</b> — ${t("howto.skills.freeze.desc")}</li>
      </ul>
      <p class="howto-note">${t("howto.note")}</p>
    </section>
    <section class="howto-sec">
      <h3>🪙 ${t("howto.pickup.title")}</h3>
      <ul class="howto-list">
        <li>${t("howto.pickup.magnet")}</li>
        <li>${t("howto.pickup.shield")}</li>
        <li>${t("howto.pickup.bomb")}</li>
        <li>${t("howto.pickup.freeze")}</li>
      </ul>
    </section>
    <section class="howto-sec">
      <h3>🏁 ${t("howto.goals.title")}</h3>
      <ul class="howto-list">
        <li>${t("howto.goals.survive")}</li>
        <li>${t("howto.goals.near")}</li>
        <li>${t("howto.goals.level")}</li>
      </ul>
    </section>`;
}
renderHowto(i18n);

/* =========================================================
   Core
   ========================================================= */
const audio = new AudioManager(); try { audio.unlock?.(); } catch(_) {}
app.audio = audio;

const hud = new HUD(i18n);
const ui  = new Overlays(i18n);

let progress = ensureDailyWeekly(loadProgress());
for (const arr of [progress.dailies, progress.weeklies]) {
  if (!arr) continue;
  for (const m of arr) if (m.rewarded === undefined) m.rewarded = !!m.done;
}

const settings = new SettingsPanel(i18n, audio);
const shop     = new ShopPanel(i18n, progress);
const missions = new MissionsPanel(i18n);
missions.setDailyWeekly(progress.dailies, progress.weeklies);
hud.setCoins(progress.coins ?? 0);

const game = new Game(app, hud, ui, i18n);
window.__game = game;

shop.onEquipChange = (equip) => {
  game.applyEquip?.(equip);
  if (game.spawner) game.spawner._cool = 0;
  app.canvas?.focus();
};

game.progress = progress;
app.game = game;

game.onProgressChange = (p)=>{
  shop.setProgress(p);
  missions.setDailyWeekly(p.dailies, p.weeklies);
  hud.setCoins(p.coins ?? 0);
};
game.onMission = (data)=> missions.render(data);

/* =========================================================
   Stage select
   ========================================================= */
const stageSelect = document.getElementById("stageSelect");
let prevStageId = "city";

function fillStageOptions(){
  if (!stageSelect) return;
  const names = STAGES.map(s => i18n.lang==="ko" ? s.name.ko : s.name.en);
  [...stageSelect.options].forEach((opt, i)=> { if (opt) opt.textContent = names[i] || opt.value; });
}

if (stageSelect){
  fillStageOptions();
  stageSelect.value = prevStageId;
  game.setStageById(prevStageId);

  stageSelect.addEventListener("change", ()=>{
    const next = stageSelect.value;
    if (["RUN","PAUSE","COUNTDOWN"].includes(game.state)){
      const msg = (i18n.lang==="ko")
        ? "스테이지를 변경하려면 게임을 다시 시작해야 합니다. 재시작할까요?"
        : "Changing stage requires a restart. Restart now?";
      if (!window.confirm(msg)){ stageSelect.value = prevStageId; return; }
    }
    prevStageId = next;
    game.setStageById(next);
    game.start(); audio.musicStart?.();
    stageSelect.blur(); app.canvas.focus();
  });
}

/* =========================================================
   Left panel toggle
   ========================================================= */
const btnHowto = document.getElementById("btnHowto");
btnHowto?.addEventListener("click", ()=>{
  document.body.classList.toggle("hide-left");
  onResize(app);
  app.canvas.focus();
});

/* =========================================================
   i18n switch
   ========================================================= */
function applyLbI18n(){
  const $btn = document.getElementById("btnLeaderboard");
  const $ttl = document.getElementById("lbTitle");
  const $btnClose = document.getElementById("btnLbClose");
  const $btnClear = document.getElementById("btnLbClear");
  const tOr = i18n.tOr.bind(i18n);
  $btn?.setAttribute("title", tOr("lb.btn_title") ?? "Leaderboard (Top 10)");
  $ttl && ($ttl.textContent = tOr("lb.title") ?? "Top 10 (Local)");
  $btnClose && ($btnClose.textContent = tOr("lb.close") ?? "Close");
  $btnClear && ($btnClear.textContent = tOr("lb.clear") ?? "Clear");
}

const updateAllI18n = ()=>{
  i18n.applyDOM();
  applyLbI18n();
  settings.setLang(i18n);
  renderHowto(i18n);
  hud.setLang(i18n); ui.setLang?.(i18n); missions.setLang(i18n);
  hud.setTime(game.scoring?.time || 0);
  hud.setScore(game.scoring?.score || 0);
  hud.setBest(game.scoring?.best || 0);
  if (stageSelect){ const cur=stageSelect.value; fillStageOptions(); stageSelect.value=cur; }
};

langSelect?.addEventListener("change", ()=>{ i18n.setLang(langSelect.value); updateAllI18n(); langSelect.blur(); app.canvas.focus(); });
langSelect?.addEventListener("keydown", (e)=>{ if (e.key==="ArrowLeft"||e.key==="ArrowRight"){ e.preventDefault(); e.stopPropagation(); langSelect.blur(); app.canvas.focus(); }});
applyLbI18n();

/* =========================================================
   Reset progress
   ========================================================= */
const btnReset = document.getElementById("btnReset");
btnReset?.addEventListener("click", ()=>{
  const msg = (i18n.lang==="ko") ? "모든 진행도(코인/경험치/미션)를 초기화할까요?" : "Reset all progress (coins/xp/missions)?";
  if (!window.confirm(msg)) return;

  let fresh = resetProgress({ hard:true });
  fresh = ensureDailyWeekly(fresh);

  game.progress = fresh;
  shop.setProgress(fresh);
  missions.setDailyWeekly(fresh.dailies, fresh.weeklies);
  hud.setCoins(fresh.coins || 0);

  if (["RUN","PAUSE","COUNTDOWN"].includes(game.state)){ game.restart(); }
  app.canvas.focus(); hud.showToast(i18n.lang==="ko" ? "초기화 완료!" : "Reset done!", 900);
});

/* =========================================================
   Buttons / Shortcuts
   ========================================================= */
const btnPlay     = document.getElementById("btnPlay");
const btnPause    = document.getElementById("btnPause");
const btnResume   = document.getElementById("btnResume");
const btnRestart1 = document.getElementById("btnRestart1");
const btnRestart2 = document.getElementById("btnRestart2");

btnPlay   && (btnPlay.onclick   = ()=>{ audio.unlock?.(); audio.sfxClick?.(); game.start(); audio.musicStart?.(); });
btnPause  && (btnPause.onclick  = ()=>{ audio.sfxPause?.(); game.togglePause(); });
btnResume && (btnResume.onclick = ()=>{ audio.sfxClick?.(); game.togglePause(); });
btnRestart1 && (btnRestart1.onclick = ()=>{ audio.sfxClick?.(); game.restart(); audio.musicStart?.(); });
btnRestart2 && (btnRestart2.onclick = ()=>{ audio.sfxClick?.(); game.restart(); audio.musicStart?.(); });

/* ===== Mute button ===== */
const btnMute = document.getElementById("btnMute");
function updateMuteIcon(){ if (!btnMute) return; btnMute.textContent = audio.muted ? "🔇" : "🔊"; btnMute.setAttribute("aria-pressed", audio.muted ? "true" : "false"); }
btnMute?.addEventListener("click", ()=>{ if (typeof audio.toggleMuted==="function") audio.toggleMuted(); else if (typeof audio.setMuted==="function") audio.setMuted(!audio.muted); else audio.muted=!audio.muted; updateMuteIcon(); audio.sfxClick?.(); });
updateMuteIcon();

/* ===== Keyboard shortcuts ===== */
window.addEventListener("keydown",(e)=>{
  if (e.key===" "||e.key==="Enter"){ if (game.state==="START"||game.state==="GAMEOVER"){ audio.unlock?.(); audio.sfxClick?.(); game.start(); audio.musicStart?.(); } }
  if (e.key==="p"||e.key==="P"){ audio.sfxPause?.(); game.togglePause(); }
  if (e.key==="r"||e.key==="R"){ audio.sfxClick?.(); game.restart(); audio.musicStart?.(); }
});

/* =========================================================
   ====  L O C A L   L E A D E R B O A R D   L O G I C  ====
   ========================================================= */

/* Chuẩn hoá + so sánh mềm để diệt bản “PLAYER” được lưu trước khi hỏi tên */
function normalize(rec){
  const score = Math.max(0, Math.floor(Number(rec.score || 0)));
  const t = Math.max(0, Number(rec.timeSec || 0));
  return { name: String(rec.name||"PLAYER").slice(0,16), score, timeSec: t, timeKey: Number(t.toFixed(1)), stageId: String(rec.stageId||""), date: rec.date || Date.now() };
}
function sameTupleSoft(a,b){
  if (a.score !== b.score) return false;
  if (String(a.stageId) !== String(b.stageId)) return false;
  if (a.timeKey === b.timeKey) return true;
  return Math.abs(Number(a.timeSec)-Number(b.timeSec)) < 0.05;
}

/* Top10 rule: score desc, tie-break time desc */
function qualifiesTop10(score, timeSec){
  const top = loadBoard() || [];
  if (top.length < 10) return true;
  const last = top[top.length - 1];
  if (score > last.score) return true;
  if (score === last.score && timeSec > last.timeSec) return true;
  return false;
}

/* Lưu có dedupe: gỡ mọi bản “PLAYER” (hoặc bản trùng) cùng tuple trước khi push */
function saveLeaderRecord(recIn){
  const rec = normalize(recIn);
  const list = (loadBoard() || []).map(normalize);

  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    if (sameTupleSoft(it, rec)) {
      // xoá bản cũ nếu không có tên (PLAYER) hoặc tên trùng
      if (it.name === "PLAYER" || it.name === rec.name) list.splice(i,1);
    }
  }

  list.push(rec);
  list.sort((a,b)=>(b.score - a.score) || (b.timeSec - a.timeSec));
  saveBoard(list.slice(0,10));
}

function maybeSaveToLeaderboard(){
  if (!game || !game.scoring) return;
  const { score=0, time=0 } = game.scoring;
  const timeSec = Number(time || 0);
  if (!qualifiesTop10(score, timeSec)) return;

  const ask = i18n.tOr("lb.name_prompt") || "Enter your name:";
  let name = window.prompt(ask, localStorage.getItem("player_name") || "PLAYER");
  if (name == null) return; // cancel
  name = String(name).trim().slice(0,16) || "PLAYER";
  localStorage.setItem("player_name", name);

  saveLeaderRecord({ name, score: Math.floor(score||0), timeSec, stageId: game.stage?.id || "" });
}

/* =========================================================
   🏆 Leaderboard dropdown
   ========================================================= */
(function initLeaderboardTopbar(){
  const btn = document.getElementById("btnLeaderboard");
  let panel  = document.getElementById("leaderboardPanel");
  const listEl = document.getElementById("lbList");
  const btnClose = document.getElementById("btnLbClose");
  const btnClear = document.getElementById("btnLbClear");

  if (!btn || !panel || !listEl){ console.warn("[LB] Missing button/panel elements."); return; }
  if (panel.parentElement !== document.body){ document.body.appendChild(panel); }

  panel.classList.add("hidden"); panel.setAttribute("aria-hidden","true");

  function tOr(key,fb){ return i18n.tOr(key) ?? fb; }

  function renderList(){
    const data = loadBoard() || [];
    if (!Array.isArray(data) || data.length===0){
      listEl.innerHTML = `<li><em>${tOr("lb.no_records","No records yet.")}</em></li>`; return;
    }
    const lblScore=tOr("lb.score","Score"), lblTime=tOr("lb.time","Time"), lblStage=tOr("lb.stage","Stage");
    const isOrdered = String(listEl.tagName).toUpperCase()==="OL";
    listEl.innerHTML = data.map((r,i)=>{
      const prefix = isOrdered ? "" : `<b>${i+1}.</b> `;
      return `<li>${prefix}<b>${r.name}</b> — ${lblScore}: ${r.score} • ${lblTime}: ${Number(r.timeSec).toFixed(1)}s • ${lblStage}: ${r.stageId}</li>`;
    }).join("");
  }
  window.__lb_renderList = ()=>{ if (!panel.classList.contains("hidden")) renderList(); };

  function placePanel(){
    const r = btn.getBoundingClientRect(), gap=6, vw=document.documentElement.clientWidth;
    panel.style.position="fixed"; panel.style.top=`${Math.round(r.bottom+gap)}px`;
    panel.style.right=`${Math.max(8, vw-r.right)}px`; panel.style.left="auto"; panel.style.zIndex="9999";
  }
  function openPanel(){ renderList(); placePanel(); panel.classList.remove("hidden"); panel.setAttribute("aria-hidden","false"); }
  function closePanel(){ panel.classList.add("hidden"); panel.setAttribute("aria-hidden","true"); }
  function togglePanel(){ panel.classList.contains("hidden") ? openPanel() : closePanel(); }

  btn.addEventListener("click", ()=>{ audio?.sfxClick?.(); togglePanel(); });
  btnClose?.addEventListener("click", ()=>{ audio?.sfxClick?.(); closePanel(); });

  document.addEventListener("click",(e)=>{ if (panel.classList.contains("hidden")) return; if (!(panel.contains(e.target)||btn.contains(e.target))) closePanel(); });
  document.addEventListener("keydown",(e)=>{ if (e.key==="Escape" && !panel.classList.contains("hidden")) closePanel(); });

  function clearBestEverywhere(){
    try{ localStorage.removeItem("avoid_best"); }catch{}
    try{ localStorage.removeItem("avoidboxes.best"); }catch{}
    try{ if (game?.scoring){ game.scoring.best=0; hud.setBest(0); } }catch{}
  }
  btnClear?.addEventListener("click", ()=>{
    audio?.sfxClick?.();
    const msg=tOr("lb.confirm_clear","Clear all local records?");
    if (confirm(msg)){ saveBoard([]); clearBestEverywhere(); renderList(); try{ hud.showToast?.(tOr("lb.cleared","Cleared!"),900);}catch{} }
  });

  window.addEventListener("resize", ()=>{ if (!panel.classList.contains("hidden")) placePanel(); });
  window.addEventListener("scroll", ()=>{ if (!panel.classList.contains("hidden")) placePanel(); });
})();

/* =========================================================
   Loop / Resize / Scale
   ========================================================= */
let __prevState = game.state;
let __lbCheckedThisRound = false;

function frame(){
  const dt = game.timeSys.step();
  game.update(dt);
  game.render();

  if (game.state === "RUN" && __prevState !== "RUN") __lbCheckedThisRound = false;

  if (game.state === "GAMEOVER" && !__lbCheckedThisRound) {
    __lbCheckedThisRound = true;
    maybeSaveToLeaderboard();
    window.__lb_renderList?.();
  }

  __prevState = game.state;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("resize", () => onResize(app));
onResize(app);

/* Uniform scale */
(function setupUniformScale(){
  const scaleRoot = document.getElementById("scaleRoot");
  const grid = document.querySelector(".main-grid");
  if (!scaleRoot || !grid) return;

  const cs = getComputedStyle(grid);
  const baseLeft   = parseFloat(cs.getPropertyValue("--base-left"))   || 260;
  const baseCenter = parseFloat(cs.getPropertyValue("--base-center")) || 540;
  const baseRight  = parseFloat(cs.getPropertyValue("--base-right"))  || 320;
  const baseGap    = parseFloat(cs.getPropertyValue("--base-gap"))    || 16;

  const baseWidth  = baseLeft + baseCenter + baseRight + baseGap * 2;
  const baseHeight = window.innerHeight -
                     (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64) -
                     baseGap;

  function applyScale(){
    const vw = window.innerWidth;
    const scale = Math.min(1, vw / baseWidth);
    scaleRoot.style.transform = `scale(${scale})`;
    scaleRoot.style.width  = baseWidth + "px";
    scaleRoot.style.height = (baseHeight > 300 ? baseHeight : 300) + "px";
  }
  window.addEventListener("resize", applyScale);
  applyScale();
})();
