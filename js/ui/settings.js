// js/ui/settings.js
export class SettingsPanel {
  constructor(i18n, audio){
    this.i18n  = i18n;
    this.audio = audio;

    // Các node sẵn có trong HTML (giữ nguyên ID hiện tại)
    this.el       = document.getElementById("settingsOverlay");
    this.btnOpen  = document.getElementById("btnSettings");
    this.btnClose = document.getElementById("btnCloseSettings");
    this.rSfx     = document.getElementById("sfxRange");
    this.rMus     = document.getElementById("musicRange");
    this.vSfx     = document.getElementById("sfxVal");
    this.vMus     = document.getElementById("musicVal");

    if (!this.el) return; // thiếu overlay thì bỏ qua an toàn

    // Khởi tạo giá trị từ AudioManager hoặc localStorage
    const sfxV = clamp01(Number(this.audio?.sfxVol ?? localStorage.getItem("audio_sfx") ?? 0.9));
    const musV = clamp01(Number(this.audio?.musicVol ?? localStorage.getItem("audio_music") ?? 0.3));

    if (this.rSfx){ this.rSfx.value = Math.round(sfxV * 100); }
    if (this.rMus){ this.rMus.value = Math.round(musV * 100); }
    if (this.vSfx){ this.vSfx.textContent = `${Math.round(sfxV*100)}%`; }
    if (this.vMus){ this.vMus.textContent = `${Math.round(musV*100)}%`; }

    // Gán về AudioManager ngay khi load
    this._setSfxVolume(sfxV);
    this._setMusicVolume(musV);

    this._wire();
    this.applyI18nInside(); // áp dụng i18n cho toàn bộ overlay
  }

  /* --------- gắn event --------- */
  _wire(){
    this.btnOpen?.addEventListener("click", ()=>{
      this.audio?.sfxClick?.();
      this.syncFromAudio();
      this.show(true);
    });

    this.btnClose?.addEventListener("click", ()=>{
      this.audio?.sfxClick?.();
      this.show(false);
    });

    // click nền tối để đóng
    this.el.addEventListener("click",(e)=>{
      if (e.target === this.el) this.show(false);
    });

    // ESC để đóng
    document.addEventListener("keydown",(e)=>{
      if (e.key === "Escape" && !this.el.classList.contains("hidden")) this.show(false);
    });

    // sliders
    this.rSfx?.addEventListener("input", ()=>{
      const v = clamp01(Number(this.rSfx.value)/100);
      if (this.vSfx) this.vSfx.textContent = `${this.rSfx.value}%`;
      this._setSfxVolume(v);
      localStorage.setItem("audio_sfx", String(v));
    });

    this.rMus?.addEventListener("input", ()=>{
      const v = clamp01(Number(this.rMus.value)/100);
      if (this.vMus) this.vMus.textContent = `${this.rMus.value}%`;
      this._setMusicVolume(v);
      localStorage.setItem("audio_music", String(v));
    });
  }

  /* --------- i18n cho riêng overlay --------- */
  applyI18nInside(){
    if (!this.el || !this.i18n) return;
    // Tất cả phần tử con có data-i18n sẽ được set textContent theo key
    const nodes = this.el.querySelectorAll("[data-i18n]");
    nodes.forEach((n)=>{
      const key = n.getAttribute("data-i18n");
      if (!key) return;
      const txt = (this.i18n.tOr ? this.i18n.tOr(key) : null) ?? key;
      // nếu phần tử là input/button có value → set value, còn lại set textContent
      if (n.tagName === "INPUT" && (n.type === "button" || n.type === "submit")) {
        n.value = txt;
      } else if (n.tagName === "BUTTON") {
        n.textContent = txt;
      } else {
        n.textContent = txt;
      }
    });

    // Tooltip cho nút mở (nếu cần)
    if (this.btnOpen && this.i18n?.tOr){
      this.btnOpen.setAttribute("title", this.i18n.tOr("settings.title") ?? "Settings");
    }
  }

  setLang(i18n){
    this.i18n = i18n;
    // Chỉ cập nhật nội dung bên trong overlay, không phụ thuộc applyDOM toàn trang
    this.applyI18nInside();
  }

  /* --------- hiển thị / ẩn --------- */
  show(b){
    this.el.classList.toggle("hidden", !b);
    this.el.setAttribute("aria-hidden", b ? "false" : "true");
  }

  /* --------- đồng bộ UI với Audio --------- */
  syncFromAudio(){
    const sfxV = this._getSfxVolume();
    const musV = this._getMusicVolume();
    if (this.rSfx){ this.rSfx.value = Math.round(sfxV * 100); }
    if (this.rMus){ this.rMus.value = Math.round(musV * 100); }
    if (this.vSfx){ this.vSfx.textContent = `${Math.round(sfxV*100)}%`; }
    if (this.vMus){ this.vMus.textContent = `${Math.round(musV*100)}%`; }
  }

  /* --------- helpers Audio (tương thích nhiều version) --------- */
  _getSfxVolume(){
    const a = this.audio || {};
    if (typeof a.getSfxVolume === "function") return clamp01(a.getSfxVolume());
    if (typeof a.getSfx       === "function") return clamp01(a.getSfx());
    if (typeof a.sfxVol       === "number")   return clamp01(a.sfxVol);
    if (typeof a.sfxVolume    === "number")   return clamp01(a.sfxVolume);
    return 1;
  }
  _getMusicVolume(){
    const a = this.audio || {};
    if (typeof a.getMusicVolume === "function") return clamp01(a.getMusicVolume());
    if (typeof a.getMusic       === "function") return clamp01(a.getMusic());
    if (typeof a.musicVol       === "number")   return clamp01(a.musicVol);
    if (typeof a.musicVolume    === "number")   return clamp01(a.musicVolume);
    return 1;
  }
  _setSfxVolume(v){
    const a = this.audio || {};
    if (typeof a.setSfxVolume === "function") a.setSfxVolume(v);
    else if (typeof a.setSfx  === "function") a.setSfx(v);
    else if ("sfxVol" in a) a.sfxVol = v;
    else a.sfxVolume = v;
  }
  _setMusicVolume(v){
    const a = this.audio || {};
    if (typeof a.setMusicVolume === "function") a.setMusicVolume(v);
    else if (typeof a.setMusic  === "function") a.setMusic(v);
    else if ("musicVol" in a) a.musicVol = v;
    else a.musicVolume = v;
  }
}

/* ---------- utils ---------- */
function clamp01(x){ return Math.max(0, Math.min(1, Number(x || 0))); }
