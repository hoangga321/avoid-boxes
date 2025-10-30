// js/ui/settings.js
export class SettingsPanel {
  constructor(i18n, audio){
    this.i18n = i18n;
    this.audio = audio;

    this.el = document.getElementById("settingsOverlay");
    this.btnOpen  = document.getElementById("btnSettings");
    this.btnClose = document.getElementById("btnCloseSettings");
    this.rSfx = document.getElementById("sfxRange");
    this.rMus = document.getElementById("musicRange");
    this.vSfx = document.getElementById("sfxVal");
    this.vMus = document.getElementById("musicVal");

    // Guard: nếu thiếu node, đừng làm vỡ app
    if (!this.el) return;

    // init values
    const sfxV = Number(this.audio?.sfxVol ?? localStorage.getItem("audio_sfx") ?? 0.9);
    const musV = Number(this.audio?.musicVol ?? localStorage.getItem("audio_music") ?? 0.3);
    if (this.rSfx){ this.rSfx.value = Math.round(sfxV * 100); }
    if (this.rMus){ this.rMus.value = Math.round(musV * 100); }
    if (this.vSfx){ this.vSfx.textContent = `${Math.round(sfxV*100)}%`; }
    if (this.vMus){ this.vMus.textContent = `${Math.round(musV*100)}%`; }

    // open/close
    this.btnOpen?.addEventListener("click", ()=>{
      this.audio?.sfxClick?.();
      this.show(true);
    });
    this.btnClose?.addEventListener("click", ()=>{
      this.audio?.sfxClick?.();
      this.show(false);
    });
    this.el.addEventListener("click",(e)=>{ if(e.target===this.el) this.show(false); });

    // sliders
    this.rSfx?.addEventListener("input", ()=>{
      const v = Number(this.rSfx.value)/100;
      if (this.vSfx) this.vSfx.textContent = `${this.rSfx.value}%`;
      this.audio?.setSfxVolume?.(v);
      if (this.audio?.sfx) this.audio.sfx.gain.value = v;
      localStorage.setItem("audio_sfx", String(v));
    });
    this.rMus?.addEventListener("input", ()=>{
      const v = Number(this.rMus.value)/100;
      if (this.vMus) this.vMus.textContent = `${this.rMus.value}%`;
      this.audio?.setMusicVolume?.(v);
      localStorage.setItem("audio_music", String(v));
    });
  }

  setLang(i18n){ this.i18n = i18n; /* text auto-updated by i18n.applyDOM */ }
  show(b){ this.el.classList.toggle("hidden", !b); }
}
