// js/ui/hud.js — HUD: Time/Score/Best, Combo, Toast + Coins (+N) + Mission + Boss Warning
export class HUD {
  constructor(i18n) {
    this.i18n = i18n;

    // HUD có sẵn
    this.elTime  = document.getElementById("uiTime");
    this.elScore = document.getElementById("uiScore");
    this.elBest  = document.getElementById("uiBest");
    this.toast   = document.getElementById("toast");

    // Combo (nếu dùng)
    this.comboWrap  = document.getElementById("comboWrap");
    this.comboFill  = document.getElementById("comboFill");
    this.comboCount = document.getElementById("comboCount");
    this.comboMult  = document.getElementById("comboMult");

    // Coins của lượt (+N)
    this.coinsPill = document.createElement("div");
    this.coinsPill.id = "hudSessionCoins";
    this.coinsPill.className = "hud-coins pill";
    this.coinsPill.innerHTML = `
      <span class="coin-icon" aria-hidden="true"></span>
      <span class="coin-text">+0</span>
    `;
    this._mountNear(this.elBest, this.coinsPill, { left:12, top:72 });

    // ===== Mission pill (tiến độ + progress) =====
    this.misPill = document.createElement("div");
    this.misPill.id = "hudMission";
    this.misPill.className = "hud-mission pill";
    this.misPill.innerHTML = `
      <span class="mis-ico" aria-hidden="true">🏁</span>
      <span class="mis-text">0/0</span>
      <div class="mis-bar"><div class="mis-fill" style="width:0%"></div></div>
    `;
    const topRight = document.querySelector(".top-right");
    if (topRight) topRight.insertAdjacentElement("afterend", this.misPill);
    else this._mountNear(this.coinsPill, this.misPill, { right:12, top:118 });

    // ===== Boss Warning overlay (mặc định ẩn) =====
    this.warn = document.createElement("div");
    this.warn.id = "bossWarn";
    this.warn.className = "boss-warning hidden";
    this.warn.innerHTML = `
      <div class="bw-inner">
        <div class="bw-title">WARNING</div>
        <div class="bw-sub"></div>
      </div>
    `;
    document.body.appendChild(this.warn);

    // init
    this.setSessionCoins(0);
    this.setMissionProgress(0, 0);
  }

  // ====== API công khai ======
  setLang(i18n){ this.i18n = i18n; }

  setTime(t){
    if (!this.elTime) return;
    const sec = (t && t.toFixed) ? t.toFixed(1) : t;
    this.elTime.textContent = `${this._t("hud.time","Time")}: ${sec}${this._t("unit.sec","s")}`;
  }

  setScore(s){
    if (!this.elScore) return;
    this.elScore.textContent = `${this._t("hud.score","Score")}: ${s}`;
  }

  setBest(b){
    if (!this.elBest) return;
    const val = (b && b.toFixed) ? b.toFixed(1) : b;
    this.elBest.textContent = `${this._t("hud.best","Best")}: ${val}${this._t("unit.sec","s")}`;
  }

  showToast(text, ms = 1200){
    if (!this.toast) return;
    if (!text){ this.hideToast(); return; }
    this.toast.textContent = String(text);
    this.toast.style.display = "block";
    clearTimeout(this._toastT);
    this._toastT = setTimeout(()=>{ this.toast.style.display = "none"; }, ms);
  }
  hideToast(){
    if (!this.toast) return;
    clearTimeout(this._toastT);
    this.toast.style.display = "none";
    this.toast.textContent = "";
  }

  setCombo(count, mult, frac){
    if (!this.comboWrap || !this.comboFill || !this.comboCount || !this.comboMult) return;
    if (count > 0){
      this.comboWrap.classList.remove("hidden");
      this.comboCount.textContent = String(count);
      this.comboMult.textContent  = `${mult.toFixed(2)}x`;
      this.comboFill.style.width  = `${Math.floor(frac * 100)}%`;
    } else {
      this.comboWrap.classList.add("hidden");
    }
  }

  // Coins tạm của lượt
  setSessionCoins(n){
    const el = this.coinsPill?.querySelector(".coin-text");
    if (el) el.textContent = `+${Math.max(0, Math.floor(n || 0))}`;
    if (this.coinsPill){
      this.coinsPill.classList.toggle("ghost", !n);
    }
  }
  setRunCoin(n){ this.setSessionCoins(n); }

  // ===== BỎ HUD Boss Timer: nếu game có gọi setBossTimer thì biến nó thành no-op/ẩn =====
  setBossTimer(){ /* intentionally no-op to avoid showing any boss HUD */ }

  // ===== Mission progress =====
  setMissionProgress(done, total){
    const txt = this.misPill?.querySelector(".mis-text");
    const fill= this.misPill?.querySelector(".mis-fill");
    done  = Math.max(0, Number(done || 0));
    total = Math.max(0, Number(total || 0));
    if (txt) txt.textContent = `${done}/${total}`;
    if (fill){
      const pct = total > 0 ? (done/total) : 0;
      fill.style.width = `${Math.floor(pct*100)}%`;
    }
  }
  setMissionPct(pct0to1){
    const fill= this.misPill?.querySelector(".mis-fill");
    if (fill){
      const pct = Math.max(0, Math.min(1, Number(pct0to1||0)));
      fill.style.width = `${Math.floor(pct*100)}%`;
    }
  }

  // ===== FLASH cảnh báo trước khi boss xuất hiện =====
  /**
   * @param {"ufo"|"thunder"|"dragon"} type
   * @param {number} ms thời gian flash (ms)
   */
  showBossWarning(type="ufo", ms=1600){
    if (!this.warn) return;
    const sub = this.warn.querySelector(".bw-sub");
    const title = this.warn.querySelector(".bw-title");
    title.textContent = this._t("hud.warning","WARNING");
    sub.textContent = (type==="ufo")     ? this._t("hud.bossUfo","UFO Approaching")
                  : (type==="thunder") ? this._t("hud.bossThunder","Thunder God Descends")
                  :                      this._t("hud.bossDragon","Dragon Awakens");
    this.warn.classList.remove("hidden","type-ufo","type-thunder","type-dragon");
    this.warn.classList.add("type-"+type);
    // kích hoạt animation
    void this.warn.offsetWidth;
    this.warn.classList.add("active");
    clearTimeout(this._warnT);
    this._warnT = setTimeout(()=>{
      this.warn.classList.remove("active");
      this.warn.classList.add("hidden");
    }, Math.max(600, ms));
  }

  // API khác giữ nguyên
  setCoins(){ /* unchanged */ }
  setLevelProgress(){ /* unchanged */ }
  setPowerStock(){ /* unchanged */ }

  usePowerBlink(){
    const pill = document.getElementById("hudSessionCoins");
    if (!pill) return;
    pill.style.animation = "powerBlink .25s linear 1";
    clearTimeout(this._pbT);
    this._pbT = setTimeout(()=>{ pill.style.animation = ""; }, 260);
  }

  // helpers
  _t(key, fallback){ try { return this.i18n?.t?.(key) ?? fallback; } catch { return fallback; } }

  _mountNear(anchor, el, abs){
    let mounted = false;
    if (anchor && anchor.parentElement){
      try { anchor.insertAdjacentElement("afterend", el); mounted = true; } catch(_){}
    }
    if (!mounted){
      const stage = document.querySelector(".game-stage") || document.body;
      stage.appendChild(el);
      Object.assign(el.style, {
        position:"absolute",
        left: abs?.left != null ? abs.left+"px" : "",
        right:abs?.right!= null ? abs.right+"px": "",
        top:  abs?.top  != null ? abs.top+"px"  : ""
      });
    }
  }
}
