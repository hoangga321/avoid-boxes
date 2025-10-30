// Điều khiển panel "Today's Missions" + Daily/Weekly (nếu có)
export class MissionsPanel {
  constructor(i18n){
    this.i18n = i18n;
    this.root = document.getElementById("panelMissions") || document.body;

    // Level block
    this.levelWrap = document.createElement("div");
    this.levelWrap.id = "missionsLevel";
    this.levelTitle = document.createElement("h3");
    this.levelList  = document.createElement("ul");
    this.levelList.id = "missionsList";
    this.levelWrap.appendChild(this.levelTitle);
    this.levelWrap.appendChild(this.levelList);

    // Daily/Weekly block (tuỳ có)
    this.dailyWrap = document.createElement("div");
    this.dailyTitle = document.createElement("h3");
    this.dailyList  = document.createElement("div");
    this.dailyList.id = "misDaily";
    this.dailyWrap.appendChild(this.dailyTitle);
    this.dailyWrap.appendChild(this.dailyList);

    this.weeklyWrap = document.createElement("div");
    this.weeklyTitle = document.createElement("h3");
    this.weeklyList  = document.createElement("div");
    this.weeklyList.id = "misWeekly";
    this.weeklyWrap.appendChild(this.weeklyTitle);
    this.weeklyWrap.appendChild(this.weeklyList);

    this.root.appendChild(this.levelWrap);
    this.root.appendChild(this.dailyWrap);
    this.root.appendChild(this.weeklyWrap);

    this._lastData = null;
    this._dailies = null;
    this._weeklies = null;
    this._updateTitles();
  }

  setLang(i18n){
    this.i18n = i18n;
    this._updateTitles();
    this.render(this._lastData);
  }

  // Dữ liệu Level (thời gian/near-miss) do Game gửi vào mỗi frame
  render(data){
    this._lastData = data;
    const t = (en,ko)=> this.i18n.lang==="ko" ? ko : en;

    if(!data){
      this.levelList.innerHTML = `<li>${t("No missions yet.","아직 미션이 없습니다.")}</li>`;
    } else {
      const { levelIdx, levelTotal, goalTimeSec, timeElapsed, nearMiss, nearTarget } = data;
      const timePct = Math.max(0, Math.min(100, Math.floor(100*(timeElapsed||0)/Math.max(1,goalTimeSec||0))));
      const nearPct = Math.max(0, Math.min(100, Math.floor(100*(nearMiss||0)/Math.max(1,nearTarget||0))));

      this.levelList.innerHTML = `
        <li><strong>${t("Level","레벨")}:</strong> ${levelIdx+1}/${levelTotal}</li>
        <li>${t("Survive","목표 생존 시간")}: ${goalTimeSec||0}s
          <div class="bar"><span style="width:${timePct}%"></span></div>
        </li>
        <li>${t("Bonus: Near-miss","보너스: 근접 회피")}: ${nearMiss||0}/${nearTarget||0}
          <div class="bar"><span style="width:${nearPct}%"></span></div>
        </li>
      `;
    }

    // Daily/Weekly nếu đã cung cấp qua setDailyWeekly
    this._renderArray(this.dailyList, this._dailies || []);
    this._renderArray(this.weeklyList, this._weeklies || []);
  }

  // Dữ liệu Daily/Weekly (nếu bạn có dùng)
  setDailyWeekly(dailies, weeklies){
    this._dailies = dailies || [];
    this._weeklies = weeklies || [];
    // re-render giữ nguyên data level hiện tại
    this.render(this._lastData);
  }

  _renderArray(root, arr){
    const t = (en,ko)=> this.i18n.lang==="ko" ? ko : en;
    root.innerHTML = "";
    if (!arr || arr.length===0){
      const p = document.createElement("p");
      p.textContent = t("No tasks.","임무가 없습니다.");
      root.appendChild(p);
      return;
    }
    for (const m of arr){
      const row = document.createElement("div");
      row.className = "mis-row";
      const label = (this.i18n.lang==="ko" ? (m.labelKO || m.labelKo) : m.labelEN) || "";
      row.innerHTML = `
        <div class="l">${label}</div>
        <div class="r">${Math.floor(m.prog||0)}/${m.goal}${m.done?" ✔":""}</div>
      `;
      root.appendChild(row);
    }
  }

  _updateTitles(){
    const t = (en,ko)=> this.i18n.lang==="ko" ? ko : en;
    this.levelTitle.textContent  = t("Level Missions","레벨 임무");
    this.dailyTitle.textContent  = t("Dailies","일일 임무");
    this.weeklyTitle.textContent = t("Weeklies","주간 임무");
  }
}
