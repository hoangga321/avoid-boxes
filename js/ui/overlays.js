export class Overlays{
  constructor(i18n){
    this.i18n = i18n;
    this.start    = document.getElementById("overlayStart");
    this.pause    = document.getElementById("overlayPause");
    this.countdown= document.getElementById("overlayCountdown");
    this.countNum = document.getElementById("countNum");
    this.gameover = document.getElementById("overlayGameOver");
    this.final    = document.getElementById("finalResult");
  }
  setLang(i18n){ this.i18n = i18n; }
  showStart(b){    this.start.classList.toggle("hidden", !b); this.start.classList.toggle("show", b); }
  showPause(b){    this.pause.classList.toggle("hidden", !b); }
  showCountdown(b){this.countdown.classList.toggle("hidden", !b); }
  setCountNum(n){  this.countNum.textContent = String(n); }
  showGameOver(b){ this.gameover.classList.toggle("hidden", !b); }
// Thay thế nguyên hàm
setFinal(timeSec, bestSec, isNewBest = false, reward){
  // helper dịch nhỏ
  const t = (en, ko) => (this.i18n?.lang === "ko" ? ko : en);

  // Tiêu đề lớn
  const title = `${t("Time","시간")}: ${timeSec.toFixed(1)}s | ${t("Best","최고")}: ${bestSec.toFixed(1)}s ${isNewBest ? "🏆" : ""}`;
  if (this.final) this.final.textContent = title;

  // Vùng chi tiết (tạo nếu chưa có)
  let el = document.getElementById("gameoverStats");
  if (!el){
    el = document.createElement("div");
    el.id = "gameoverStats";
    (document.getElementById("panelGameOver") || document.body).appendChild(el);
  }

  el.innerHTML = `
    <div>${title}</div>
    ${reward ? `
      <div class="reward">
        +${reward.coins} 💰  +${reward.xp} XP<br>
        ${t("Total","합계")}: ${reward.totalCoins} 💰  ${reward.totalXp} XP
      </div>` : ""
    }
  `;
}
}
