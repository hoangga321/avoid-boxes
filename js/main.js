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

/* =========================================================
   App bootstrap
   ========================================================= */
const canvas = document.getElementById("gameCanvas");
const app = {
  canvas,
  ctx: canvas.getContext("2d"),
  logicWidth: 540,
  logicHeight: 720,
  dpr: window.devicePixelRatio || 1
};

const i18n = new I18n();
i18n.applyDOM();

initRenderer(app);
initInput(app);

/* =========================================================
   How-to panel content (i18n)
   ========================================================= */
const langSelect = document.getElementById("langSelect");
langSelect && (langSelect.value = i18n.lang);

function renderHowto(i18nInst){
  const t = i18nInst.t.bind(i18nInst);
  const $title = document.getElementById("howtoTitle");
  const $body  = document.getElementById("howtoBody");
  if (!$title || !$body) return;

  $title.textContent = t("howto.title");

  const html = `
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
  $body.innerHTML = html;
}
renderHowto(i18n);

/* =========================================================
   Core singletons (Audio, HUD, UI)
   ========================================================= */
const audio = new AudioManager();
try { audio.unlock?.(); } catch(_) {}
app.audio = audio;

const hud = new HUD(i18n);
const ui  = new Overlays(i18n);

/* =========================================================
   Progress / Panels
   ========================================================= */
let progress = ensureDailyWeekly(loadProgress());
for (const arr of [progress.dailies, progress.weeklies]){
  if (!arr) continue;
  for (const m of arr){ if (m.rewarded === undefined) m.rewarded = !!m.done; }
}

const settings = new SettingsPanel(i18n, audio);
const shop     = new ShopPanel(i18n, progress);
const missions = new MissionsPanel(i18n);
missions.setDailyWeekly(progress.dailies, progress.weeklies);

/* HUD coins ngay khi vào */
hud.setCoins(progress.coins ?? 0);

/* =========================================================
   Game
   ========================================================= */
const game = new Game(app, hud, ui, i18n);
window.__game = game;

/* === CỐ ĐỊNH: Khi Equip/Unequip ở Shop → Apply ngay vào Game === */
shop.onEquipChange = (equip) => {
  // dùng pipeline chuẩn trong state.js (đã map slime.any/orc/neon...)
  game.applyEquip?.(equip);
  // ép lứa spawn kế tiếp dùng skin mới (hết “lag” tới khi chết)
  if (game.spawner) game.spawner._cool = 0;
  // trả focus cho canvas để phím không cuộn panel
  app.canvas?.focus();
};

game.progress = progress;
app.game = game;

game.onProgressChange = (p)=>{
  shop.setProgress(p);
  missions.setDailyWeekly(p.dailies, p.weeklies);
  hud.setCoins(p.coins ?? 0);
};

/* Mission → panel bên phải */
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
   Toggle panel trái (How-to)
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
langSelect?.addEventListener("change", ()=>{
  i18n.setLang(langSelect.value);

  shop.setLang(i18n);
  hud.setLang(i18n);
  ui.setLang?.(i18n);
  settings.setLang(i18n);
  missions.setLang(i18n);

  // cập nhật nhãn Stage
  if (stageSelect) {
    const cur = stageSelect.value;
    fillStageOptions();
    stageSelect.value = cur;
  }

  // re-render HUD & Howto
  hud.setTime(game.scoring?.time || 0);
  hud.setScore(game.scoring?.score || 0);
  hud.setBest(game.scoring?.best || 0);
  renderHowto(i18n);

  langSelect.blur();
  app.canvas.focus();
});
langSelect?.addEventListener("keydown", (e)=>{
  if (e.key === "ArrowLeft" || e.key === "ArrowRight"){
    e.preventDefault(); e.stopPropagation();
    langSelect.blur(); app.canvas.focus();
  }
});

/* =========================================================
   Reset progress
   ========================================================= */
const btnReset = document.getElementById("btnReset");
btnReset?.addEventListener("click", ()=>{
  const msg = (i18n.lang==="ko")
    ? "모든 진행도(코인/경험치/미션)를 초기화할까요?"
    : "Reset all progress (coins/xp/missions)?";
  if (!window.confirm(msg)) return;

  let fresh = resetProgress({ hard:true });
  fresh = ensureDailyWeekly(fresh);

  game.progress = fresh;
  shop.setProgress(fresh);
  missions.setDailyWeekly(fresh.dailies, fresh.weeklies);
  hud.setCoins(fresh.coins || 0);

  if (["RUN","PAUSE","COUNTDOWN"].includes(game.state)){
    game.restart();
  }
  app.canvas.focus();
  hud.showToast(i18n.lang==="ko" ? "초기화 완료!" : "Reset done!", 900);
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

/* ===== Mute button (robust) ===== */
const btnMute = document.getElementById("btnMute");
function updateMuteIcon(){
  if (!btnMute) return;
  btnMute.textContent = audio.muted ? "🔇" : "🔊";
  btnMute.setAttribute("aria-pressed", audio.muted ? "true" : "false");
}
btnMute?.addEventListener("click", ()=>{
  if (typeof audio.toggleMuted === "function") audio.toggleMuted();
  else if (typeof audio.setMuted === "function") audio.setMuted(!audio.muted);
  else audio.muted = !audio.muted; // fallback tuyệt đối
  updateMuteIcon();
  audio.sfxClick?.();
});
updateMuteIcon();

/* ===== Keyboard shortcuts ===== */
window.addEventListener("keydown", (e)=>{
  if (e.key===" " || e.key==="Enter"){
    if (game.state==="START" || game.state==="GAMEOVER"){
      audio.unlock?.(); audio.sfxClick?.(); game.start(); audio.musicStart?.();
    }
  }
  if (e.key==="p" || e.key==="P"){ audio.sfxPause?.(); game.togglePause(); }
  if (e.key==="r" || e.key==="R"){ audio.sfxClick?.(); game.restart(); audio.musicStart?.(); }
});

/* =========================================================
   Game loop & Resize & Uniform scale
   ========================================================= */
function frame(){
  const dt = game.timeSys.step();
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("resize", () => onResize(app));
onResize(app);

/* Uniform scale cho toàn bộ lưới (trùng cấu hình trong style.css) */
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
