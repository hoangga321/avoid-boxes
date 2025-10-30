// game/bosses.js
import { aabbIntersect } from "../engine/collision.js";

/** ====== TUNING ====== */
const UFO = {
  LASER_THICK: 14,
  LASER_VY: 320,
  LASER_LIFE: 3.0,
  GAP_MIN: 90,
  GAP_MAX: 110,
  WARN_TIME: 0.35,
  COOLDOWN: 1.05,
  SAFE_TIME: 0.9      // NEW: thời gian “hành lang an toàn”, chặn spawn chéo
};
const THUNDER = { COOLDOWN: 0.38, WARN_TIME: 0.28, VY: 640 };
const DRAGON  = { CD: 0.8 };

export class BossManager {
  constructor(app){
    this.app = app;
    this.type = null;
    this.t = 0;
    this.projectiles = [];  // {x,y,w,h,vx,vy,life,type}
    this.warns = [];        // {x1,y1,x2,y2,life}
    this.entity = null;
  }

  start(type){
    this.clear();
    this.type = type;
    this.t = 0;
    if (type === "ufo") this.entity = new UFOBoss(this.app, this);
    else if (type === "thunder") this.entity = new ThunderBoss(this.app, this);
    else this.entity = new DragonBoss(this.app, this);

    // NEW: âm thanh khi boss xuất hiện
    this.app.audio?.sfxBossIntro?.(type);
  }

  clear(){ this.projectiles.length = 0; this.warns.length = 0; this.entity = null; }

  update(dt, game){
    if (!this.entity) return;
    this.t += dt;
    this.entity.update(dt, game);

    for (const p of this.projectiles){
      p.x += (p.vx||0) * dt;
      p.y += (p.vy||0) * dt;
      if (p.life !== undefined) p.life -= dt;
    }
    for (const w of this.warns){ if (w.life !== undefined) w.life -= dt; }

    this.projectiles = this.projectiles.filter(p => p.life === undefined || p.life > 0);
    this.warns       = this.warns.filter(w => w.life === undefined || w.life > 0);
  }

  render(ctx){
    if (!this.entity) return;
    this.entity.render(ctx);

    // telegraph
    for (const w of this.warns){
      ctx.save();
      const baseLife = (this.type === "ufo") ? UFO.WARN_TIME : (this.type === "thunder" ? THUNDER.WARN_TIME : 0.35);
      ctx.globalAlpha = 0.6 * Math.max(0, Math.min(1, (w.life ?? baseLife) / baseLife));
      let col = "#f87171";
      if (this.type === "thunder") col = "#f5e34b";
      else if (this.type === "dragon") col = "#ff914d";
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
      ctx.restore();
    }

    // projectiles
    for (const p of this.projectiles){
      ctx.save();
      ctx.fillStyle = p.type==="laser" ? "rgba(255,82,82,0.9)"
                   :  p.type==="bolt"  ? "rgba(245,227,75,0.95)"
                   :  p.type==="fire"  ? "rgba(255,145,77,0.95)"
                   : "rgba(255,255,255,0.9)";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    }
  }

  hitPlayer(player){
    for (const p of this.projectiles){
      if (aabbIntersect(p, player)) return true;
    }
    return false;
  }

  isDone(){ return false; }
}

/** ===================== UFO (BOSS 1) ===================== */
class UFOBoss {
  constructor(app, mgr){
    this.app=app; this.mgr=mgr;
    this.cx=app.logicWidth*0.5; this.cy=90;
    this.t=0; this._cd=0;

    // NEW: safe corridor blocker
    this.safeCorridor = null; // {x,w,t}
  }

  update(dt, game){
    this.t += dt;
    this.cx = this.app.logicWidth * 0.5 + Math.sin(this.t*1.4) * 120;
    this.cy = 90 + Math.sin(this.t*2.1) * 10;

    if (this.safeCorridor) {
      this.safeCorridor.t -= dt;
      if (this.safeCorridor.t <= 0) this.safeCorridor = null;
    }

    this._cd -= dt;
    if (this._cd > 0) return;

    // Nếu đang có safe corridor (vừa quét ngang), ép mode về "ngang" để không chồng chéo
    let mode = Math.random();
    if (this.safeCorridor && mode >= 0.5) mode = 0.0;

    this._cd = UFO.COOLDOWN;
    if (mode < 0.50){
      // ----- NGANG có GAP -----
      const y = this.cy + 24;
      this.mgr.warns.push({ x1: 8, y1: y, x2: this.app.logicWidth-8, y2: y, life: UFO.WARN_TIME });
      setTimeout(()=> {
        const gapW = rand(UFO.GAP_MIN, UFO.GAP_MAX);
        const px   = (game?.player?.x ?? (this.app.logicWidth*0.5));
        let gapX = clamp(px + rand(-140,140) - gapW*0.5, 8, this.app.logicWidth-8-gapW);

        // NEW: lưu “hành lang an toàn” → không spawn chéo trong SAFE_TIME
        this.safeCorridor = { x: gapX, w: gapW, t: UFO.SAFE_TIME };

        this._spawnLaserRowWithGap(0, y - UFO.LASER_THICK*0.5, this.app.logicWidth, UFO.LASER_THICK, gapX, gapW);

        // NEW: SFX
        this.app.audio?.sfxBossAttack?.("laser");
      }, UFO.WARN_TIME*1000);

    } else if (mode < 0.78){
      // ----- CHÉO PHẢI (đứt đoạn) — chỉ nếu không có safe corridor -----
      const x0 = this.cx - 220, y0 = this.cy - 20, x1 = this.cx + 220, y1 = this.cy + 200;
      this.mgr.warns.push({ x1:x0, y1:y0, x2:x1, y2:y1, life:UFO.WARN_TIME });
      setTimeout(()=> {
        if (!this.safeCorridor) {
          this._spawnDashedDiag(x0,y0,x1,y1,UFO.LASER_THICK, 28, 14);
          this.app.audio?.sfxBossAttack?.("laser");
        }
      }, UFO.WARN_TIME*1000);

    } else {
      // ----- CHÉO TRÁI (đứt đoạn) — chỉ nếu không có safe corridor -----
      const x0 = this.cx + 220, y0 = this.cy - 20, x1 = this.cx - 220, y1 = this.cy + 200;
      this.mgr.warns.push({ x1:x0, y1:y0, x2:x1, y2:y1, life:UFO.WARN_TIME });
      setTimeout(()=> {
        if (!this.safeCorridor) {
          this._spawnDashedDiag(x0,y0,x1,y1,UFO.LASER_THICK, 28, 14);
          this.app.audio?.sfxBossAttack?.("laser");
        }
      }, UFO.WARN_TIME*1000);
    }
  }

  _spawnLaserRowWithGap(x,y,w,h,gapX,gapW){
    // trái gap
    if (gapX - x > 6){
      this.mgr.projectiles.push({ x, y, w: gapX - x, h, vx:0, vy: UFO.LASER_VY, life: UFO.LASER_LIFE, type:"laser" });
    }
    // phải gap
    const rightX = gapX + gapW;
    const rightW = (x + w) - rightX;
    if (rightW > 6){
      this.mgr.projectiles.push({ x: rightX, y, w: rightW, h, vx:0, vy: UFO.LASER_VY, life: UFO.LASER_LIFE, type:"laser" });
    }
  }

  _spawnDashedDiag(x0,y0,x1,y1,thick, segLen=28, holeLen=14){
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx,dy);
    const nx = dx/len, ny = dy/len;

    let t = 0;
    while (t < len){
      const run = Math.min(segLen, len - t);
      const cx = x0 + nx * t;
      const cy = y0 + ny * t;

      const step = Math.max(10, thick);
      for (let s = 0; s < run; s += step){
        const px = cx + nx * s - thick*0.5;
        const py = cy + ny * s - thick*0.5;
        this.mgr.projectiles.push({
          x: px, y: py, w: thick, h: thick,
          vx: 110*nx, vy: 290*ny + 60,
          life: 2.6, type:"laser"
        });
      }
      t += segLen + holeLen; // tạo khe hở để né
    }
  }

  render(ctx){
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.fillStyle = "#a3e5ff"; ctx.strokeStyle="#1f3b5b"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(0,0,30,16,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff5c8a";
    ctx.beginPath(); ctx.ellipse(0,10,40,10,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    const blink = (Math.sin(Date.now()*0.01)+1)/2;
    ctx.globalAlpha = 0.4 + 0.6*blink;
    ctx.beginPath(); ctx.arc(0,-4,5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/** ===================== THUNDER (BOSS 2) ===================== */
class ThunderBoss {
  constructor(app, mgr){ this.app=app; this.mgr=mgr; this.t=0; this._cd=0.55; }
  update(dt){
    this.t += dt;
    this._cd -= dt;
    if (this._cd <= 0){
      this._cd = THUNDER.COOLDOWN + Math.random()*0.1;
      const lanes = 5, w = this.app.logicWidth, laneW = w/lanes;
      const lane = Math.floor(Math.random()*lanes);
      const x = lane * laneW + laneW*0.5;
      this.mgr.warns.push({ x1:x, y1:80, x2:x, y2:this.app.logicHeight-40, life:THUNDER.WARN_TIME });
      setTimeout(()=> {
        for (let i=0;i<4;i++){
          this.mgr.projectiles.push({ x:x-8, y:80 - i*40, w:16, h:28, vx:0, vy: THUNDER.VY, life: 1.2, type:"bolt" });
        }
        // NEW: SFX
        this.app.audio?.sfxBossAttack?.("thunder");
      }, THUNDER.WARN_TIME*1000);
    }
  }
  render(ctx){
    ctx.save();
    ctx.translate(this.app.logicWidth/2, 70);
    ctx.fillStyle = "#bcd1ff"; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(-50, 0, 26, 0, Math.PI*2);
    ctx.arc(-20, -8, 30, 0, Math.PI*2);
    ctx.arc( 18, -4, 32, 0, Math.PI*2);
    ctx.arc( 50,  2, 24, 0, Math.PI*2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

/** ===================== DRAGON (BOSS 3) ===================== */
class DragonBoss {
  constructor(app, mgr){ this.app=app; this.mgr=mgr; this.t=0; this._cd=0; this.x=app.logicWidth*0.5; this.y=110; }
  update(dt, game){
    this.t += dt;
    this.x = this.app.logicWidth*0.5 + Math.sin(this.t*1.1)*140;
    this._cd -= dt;
    if (this._cd <= 0){
      this._cd = DRAGON.CD;
      const mode = Math.random();
      if (mode < 0.55){
        const n = 7, speed= 240;
        for (let i=0;i<n;i++){
          const ang = (-0.5 + i/(n-1)) * 0.7;
          const vx = Math.sin(ang)*speed, vy = Math.cos(ang)*speed;
          this.mgr.projectiles.push({ x:this.x-6, y:this.y, w:12, h:12, vx, vy, life: 3.2, type:"fire" });
        }
      } else {
        const px = game?.player?.x + (game?.player?.w||0)/2 || this.x;
        const dx = px - this.x, baseAng = Math.atan2(300, dx);
        const speed=290, spread=0.35, n=5;
        for (let i=0;i<n;i++){
          const ang = baseAng + (-spread + 2*spread*i/(n-1));
          const vx = Math.sin(ang)*speed, vy = Math.cos(ang)*speed;
          this.mgr.projectiles.push({ x:this.x-5, y:this.y, w:10, h:10, vx, vy, life: 2.8, type:"fire" });
        }
      }
      if (Math.random() < 0.45){
        const m = 6;
        for (let i=0;i<m;i++){
          const xx = Math.random()*(this.app.logicWidth-20)+10;
          this.mgr.projectiles.push({ x:xx-5, y:60- i*30, w:10, h:14, vx:0, vy: 300+Math.random()*90, life: 2.2, type: "fire" });
        }
      }
      // NEW: SFX
      this.app.audio?.sfxBossAttack?.("fire");
    }
  }
  render(ctx){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle="#7f1d1d"; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(-28, -18);
    ctx.quadraticCurveTo(0,-30, 28,-18);
    ctx.quadraticCurveTo(34,  0,  0,  22);
    ctx.quadraticCurveTo(-34, 0, -28,-18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#111";
    ctx.beginPath(); ctx.arc(-10,-8,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( 10,-8,3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/** ===== utils ===== */
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
