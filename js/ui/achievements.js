import { achIsUnlocked } from "../data/progress.js";
import { ACHS } from "../data/achievements.js";

export class AchievementsPanel{
  constructor(i18n, progress){
    this.i18n = i18n; this.progress = progress;
    this.root = document.getElementById("panelAchievements");
    if (!this.root) return;
    this.h2 = this.root.querySelector("h2");
    this.list = document.createElement("div");
    this.list.className = "ach-list";
    this.root.appendChild(this.list);
    this.render();
  }
  setLang(i18n){ this.i18n=i18n; this.render(); }
  setProgress(p){ this.progress=p; this.render(); }
  render(){
    if(!this.root) return;
    if(this.h2) this.h2.textContent = (this.i18n.lang==="ko") ? "업적" : "Achievements";
    this.list.innerHTML = "";
    ACHS.forEach(a=>{
      const row = document.createElement("div");
      row.className = "ach-item";
      const unlocked = achIsUnlocked(this.progress, a.id);
      const text = this.i18n.lang==="ko"? a.ko : a.en;
      row.innerHTML = `
        <div class="title">${text}</div>
        <div class="badge ${unlocked?"ok":""}">${unlocked?"✔":"…"}</div>
      `;
      this.list.appendChild(row);
    });
  }
}
