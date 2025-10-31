// audio.js
// Simple WebAudio manager: SFX + Music with volume, mute, and unlock on user gesture
export class AudioManager {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.sfx    = this.ctx.createGain();
    this.music  = this.ctx.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.ctx.destination);

    // prefs
    this.muted    = (localStorage.getItem("audio_muted") === "1") || false;
    this.sfxVol   = Number(localStorage.getItem("audio_sfx")   ?? "0.9");
    this.musicVol = Number(localStorage.getItem("audio_music") ?? "0.22");
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfx.gain.value    = clamp01(this.sfxVol);
    this.music.gain.value  = clamp01(this.musicVol);

    // auto-unlock
    const _autoUnlock = () => {
      if (this.ctx.state !== "running") this.ctx.resume();
      window.removeEventListener("pointerdown", _autoUnlock);
      window.removeEventListener("keydown", _autoUnlock);
    };
    window.addEventListener("pointerdown", _autoUnlock);
    window.addEventListener("keydown", _autoUnlock);

    this._musicNodes = null;
  }

  // cần cho main.js
  unlock() {
    if (this.ctx && this.ctx.state !== "running") {
      return this.ctx.resume();
    }
  }

  setMuted(on) {
    this.muted = !!on;
    localStorage.setItem("audio_muted", on ? "1" : "0");
    this.master.gain.value = on ? 0 : 1;
  }
  setSfxVolume(v) {
    this.sfxVol = clamp01(v);
    localStorage.setItem("audio_sfx", String(this.sfxVol));
    this.sfx.gain.value = this.sfxVol;
  }
  setMusicVolume(v) {
    this.musicVol = clamp01(v);
    localStorage.setItem("audio_music", String(this.musicVol));
    this.music.gain.value = this.musicVol;
  }

  // ===== SFX cơ bản (API cũ) =====
  sfxClick()    { this._beep(880, 0.04, 0.002); }
  sfxStart()    { this._beep(540, 0.08); this._beep(720, 0.08, 0.02); }
  sfxPause()    { this._beep(320, 0.06); }
  sfxBeep()     { this._beep(760, 0.05); }
  sfxNearMiss() { this._noise(0.06, 1800); }
  sfxHit()      { this._noise(0.10, 400); this._beep(180, 0.08, 0.01); }

  // ===== NEW: SFX cho Boss =====
  sfxWarn()           { this._whoosh(0.10, 300, 1000); } // dùng cho banner WARNING
  sfxBossIntro(type="ufo") {
    this._whoosh(0.18, 600, 1200);
    setTimeout(()=> this._beep(220, 0.12, 0.03), 80);
  }
  sfxBossAttack(kind="laser") {
    if (kind === "laser")    { this._beep(1200, 0.07, 0.005); this._whoosh(0.08, 900, 1400); }
    else if (kind==="thunder"){ this._noise(0.12, 2000); this._beep(400, 0.05, 0.015); }
    else if (kind==="fire")  { this._whoosh(0.10, 300, 700); this._beep(560, 0.04, 0.01); }
  }
  sfxBossClear() { this._beep(660, 0.08); this._beep(880, 0.10, 0.02); }

  // ===== Music =====
  musicStart() {
    if (this._musicNodes) return;
    const t = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g  = this.ctx.createGain();
    const lfo= this.ctx.createOscillator();

    o1.type = "sawtooth"; o2.type = "triangle";
    o1.frequency.value = 220; o2.frequency.value = 330;
    g.gain.value = clamp01(this.musicVol);

    lfo.type = "sine"; lfo.frequency.value = 0.25;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(o2.frequency);

    o1.connect(g); o2.connect(g); g.connect(this.music);
    o1.start(t); o2.start(t); lfo.start(t);
    this._musicNodes = { o1, o2, g, lfo };
  }

  musicStop() {
    if (!this._musicNodes) return;
    const { o1, o2, g, lfo } = this._musicNodes;
    const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0.0001, t, 0.1);
    setTimeout(() => {
      try{ o1.stop(); o2.stop(); lfo.stop(); }catch{}
      this._musicNodes = null;
    }, 200);
  }

  musicDuck(on=true) {
    if (!this._musicNodes) return;
    const t = this.ctx.currentTime;
    this._musicNodes.g.gain.setTargetAtTime(on ? 0.05 : clamp01(this.musicVol), t, 0.08);
  }

  // ===== primitives =====
  _beep(freq=600, dur=0.05, glide=0) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square"; o.frequency.value = Math.max(60, freq);
    g.gain.value = 0.0001;

    o.connect(g); g.connect(this.sfx);
    o.start(t);
    g.gain.setTargetAtTime(0.9, t, 0.005);
    if (glide>0) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*0.6), t+glide);
    g.gain.setTargetAtTime(0.0001, t+dur, 0.02);
    setTimeout(()=>{ try{ o.stop(); }catch{} }, (dur+0.05)*1000);
  }

  _noise(dur=0.06, lpFreq=1200) {
    const t = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<data.length;i++){ data[i] = (Math.random()*2-1)*0.9; }

    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = Math.max(80, lpFreq);
    const g = this.ctx.createGain(); g.gain.value = 0.9;

    src.connect(filter); filter.connect(g); g.connect(this.sfx);
    src.start(t);
    g.gain.setTargetAtTime(0.0001, t+dur*0.7, 0.05);
  }

  _whoosh(dur=0.12, f0=400, f1=1400) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(Math.max(40,f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t+dur);
    g.gain.value = 0.0001;
    o.connect(g); g.connect(this.sfx);
    o.start(t);
    g.gain.setTargetAtTime(1.0, t, 0.008);
    g.gain.setTargetAtTime(0.0001, t+dur, 0.03);
    setTimeout(()=>{ try{ o.stop(); }catch{} }, (dur+0.05)*1000);
  }
}

function clamp01(v){ return Math.max(0, Math.min(1, v)); }
