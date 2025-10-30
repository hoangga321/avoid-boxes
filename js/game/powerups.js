// js/game/powerups.js — Repel (đẩy ra) + hiệu ứng đẹp cho từng skill
export class Powerups {
  constructor(app, hud){
    this.app = app;
    this.hud = hud;

    // tồn kho nhặt được
    this.stock = { magnet:0, shield:0, bomb:0, freeze:0 }; // giữ key 'magnet' để tương thích phím 1

    // hiệu ứng đang chạy
    this.active = {
      // Repel (đẩy ra): radius + strength, spikeCount để vẽ tia
      magnet: { on:false, t:0, radius:140, pushStrength:260, pushYScale:0.75, spikeCount:16 },

      shield: { on:false, t:0, rot:0 },
      freeze: { on:false, t:0 },
    };

    // FX: explosions, flash, snowflakes
    this.fx = {
      explosions: [],  // {x,y,t,r,life}
      flash: 0,        // 0..1 (white flash)
      snow: [],        // {x,y,vx,vy,life}
      repelPulse: 0    // 0..1 pulse ring cho repel
    };
  }

  // ===== API inventory =====
  add(type, n=1){
    if (!this.stock[type] && this.stock[type] !== 0) this.stock[type] = 0;
    this.stock[type] = Math.min(99, this.stock[type] + n);
    this._emit();
  }
  canUse(type){ return (this.stock[type]||0) > 0; }

  trigger(type){
    if (!this.canUse(type)) return false;
    this.stock[type] -= 1;

    if (type === "magnet"){            // dùng phím 1 nhưng là đẩy (Repel)
      this.active.magnet.on = true;
      this.active.magnet.t  = 6.0;     // 6s
      this.fx.repelPulse = 1;          // kích hoạt pulse đầu
    } else if (type === "shield"){
      this.active.shield.on = true;
      this.active.shield.t  = 12.0;
    } else if (type === "freeze"){
      this.active.freeze.on = true;
      this.active.freeze.t  = 3.0;
      this._spawnSnow(22);             // bông tuyết khi bật
    } else if (type === "bomb"){
      // xử lý clear ở Game thông qua onBombClear(...)
    }
    this.hud?.usePowerBlink?.(type);
    this._emit();
    return true;
  }

  // Game gọi khi bomb nổ: dọn obstacles + sinh FX nổ
  onBombClear(obstacles){
    let count = 0;
    for (const o of obstacles){
      if (o._out) continue;
      const { x, y } = this._centerOf(o);
      this._spawnExplosion(x, y, 0.6 + Math.random()*0.25);
      o._out = true; count++;
    }
    if (count > 0) this.fx.flash = 1; // flash trắng ngắn
    return count;
  }

  // ===== tick mỗi frame =====
  update(dt, game){
    // freeze timer
    if (this.active.freeze.on){
      this.active.freeze.t -= dt;
      if (this.active.freeze.t <= 0){ this.active.freeze.on = false; }
    }

    // repel timer + đẩy ra
    if (this.active.magnet.on){
      this.active.magnet.t -= dt;
      if (this.active.magnet.t <= 0){
        this.active.magnet.on = false;
      } else {
        this.fx.repelPulse = Math.max(0, this.fx.repelPulse - dt*1.2);

        const p = game.player;
        const R  = this.active.magnet.radius;
        const R2 = R*R;
        const S  = this.active.magnet.pushStrength;
        const Sy = this.active.magnet.pushYScale;

        for (const ob of game.obstacles || []){
          if (ob._out) continue;

          // tâm obstacle
          const { x:ox, y:oy } = this._centerOf(ob);
          const dx = ox - p.x, dy = oy - p.y; // đẩy RA => vector từ player tới obstacle
          const d2 = dx*dx + dy*dy;
          if (d2 === 0 || d2 > R2) continue;

          const d  = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;

          // giảm lực khi quá gần để an toàn (soft-safe)
          const safeR = p.w * 0.85;
          const far = Math.max(0, d - safeR);
          const k   = far / R; // 0..1

          const moveX = nx * (S * k) * dt;
          const moveY = ny * (S * Sy * k) * dt;

          // dịch chuyển trực tiếp vị trí obstacle ra xa
          this._nudge(ob, moveX, moveY);

          // thêm một chút quán tính nếu engine có vx/vy
          if (typeof ob.vx === "number") ob.vx += nx * 8 * dt;
          if (typeof ob.vy === "number") ob.vy += ny * 8 * dt;
        }
      }
    }

    // shield timer + quay nhẹ
    if (this.active.shield.on){
      this.active.shield.t -= dt;
      this.active.shield.rot = (this.active.shield.rot + dt*2.4) % (Math.PI*2);
      if (this.active.shield.t <= 0){ this.active.shield.on = false; }
    }

    // FX update: explosions
    this.fx.explosions = this.fx.explosions.filter(e => {
      e.t += dt;
      return e.t < e.life;
    });

    // FX flash fade
    if (this.fx.flash > 0){
      this.fx.flash = Math.max(0, this.fx.flash - dt*2.5);
    }

    // FX snow
    if (this.active.freeze.on || this.fx.snow.length){
      const W = this.app.logicWidth, H = this.app.logicHeight;
      for (const s of this.fx.snow){
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
      }
      // giữ số lượng tuyết vừa phải khi đang freeze
      if (this.active.freeze.on && this.fx.snow.length < 30){
        this._spawnSnow(2);
      }
      // lọc
      this.fx.snow = this.fx.snow.filter(s => s.life > 0 && s.y < H+10);
      // vòng lại biên
      for (const s of this.fx.snow){
        if (s.x < -10) s.x = W+10;
        if (s.x > W+10) s.x = -10;
      }
    }
  }

  // Game hỏi có đang freeze để nhân hệ số chậm
  slowFactor(){
    return this.active.freeze.on ? 0.35 : 1.0;
  }

  // Game hỏi: khi sắp va chạm, nếu có shield thì chặn 1 lần
  tryShieldConsume(){
    if (this.active.shield.on){
      this.active.shield.on = false;
      return true;
    }
    return false;
  }

  // ===== vẽ hiệu ứng =====
  render(ctx, player){
    const W=this.app.logicWidth, H=this.app.logicHeight;

    // Freeze tint + snow
    if (this.active.freeze.on || this.fx.snow.length){
      ctx.save();
      ctx.fillStyle = "rgba(120,180,255,0.12)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const s of this.fx.snow){
        ctx.fillRect(s.x, s.y, 2, 2);
      }
      ctx.restore();
    }

    // Shield ring + arcs xoay
    if (this.active.shield.on){
      ctx.save();
      const r = player.w*0.85;
      // glow
      ctx.shadowColor = "rgba(0,208,255,0.8)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "rgba(0,208,255,1)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI*2); ctx.stroke();

      // arcs
      const a = this.active.shield.rot;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(player.x, player.y, r, a, a+0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(player.x, player.y, r, a+Math.PI, a+Math.PI+0.8); ctx.stroke();
      ctx.restore();
    }

    // Repel visual: vòng pulse + spikes quay nhẹ quanh người
    if (this.active.magnet.on){
      const baseR = this.active.magnet.radius;
      const t = 1 - this.fx.repelPulse; // 0..1
      const pulseR = baseR + (1-t)*10;  // nở ra rồi thu lại
      ctx.save();
      // vòng pulse
      ctx.strokeStyle = "rgba(255, 180, 0, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(player.x, player.y, pulseR, 0, Math.PI*2); ctx.stroke();

      // spikes
      const N = this.active.magnet.spikeCount;
      const rot = (Date.now()%2000)/2000 * Math.PI*2;
      for (let i=0;i<N;i++){
        const ang = rot + (i/N)*Math.PI*2;
        const r1 = baseR - 8, r2 = baseR + 12 + 4*Math.sin((Date.now()/120)+(i*0.7));
        const x1 = player.x + Math.cos(ang)*r1, y1 = player.y + Math.sin(ang)*r1;
        const x2 = player.x + Math.cos(ang)*r2, y2 = player.y + Math.sin(ang)*r2;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }
      ctx.restore();

      // giảm dần pulse
      this.fx.repelPulse = Math.max(0, this.fx.repelPulse - 0.03);
    }

    // Explosions (bomb)
    for (const e of this.fx.explosions){
      const k = e.t / e.life;                  // 0..1
      const alpha = 1-k;
      const R = e.r * (0.6 + 0.8*k);           // nở ra
      // vòng lửa
      ctx.save();
      ctx.globalAlpha = alpha;
      const grd = ctx.createRadialGradient(e.x, e.y, R*0.4, e.x, e.y, R);
      grd.addColorStop(0, "rgba(255,240,200,0.9)");
      grd.addColorStop(0.5, "rgba(255,160,50,0.7)");
      grd.addColorStop(1, "rgba(80,20,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // tia mảnh
      ctx.save();
      ctx.strokeStyle = `rgba(255,200,80,${alpha})`;
      ctx.lineWidth = 2;
      const rays = 8;
      for (let i=0;i<rays;i++){
        const ang = (i/rays) * Math.PI*2 + e.t*6;
        const r1 = R*0.2, r2 = R*1.1;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(ang)*r1, e.y + Math.sin(ang)*r1);
        ctx.lineTo(e.x + Math.cos(ang)*r2, e.y + Math.sin(ang)*r2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Flash trắng toàn màn khi bomb
    if (this.fx.flash > 0){
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${this.fx.flash*0.6})`;
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
  }

  // ===== helpers =====
  _emit(){ this.hud?.setPowerStock?.(this.stock, this.active); }

  _centerOf(ob){
    // hỗ trợ x/y là toạ độ góc trái trên hoặc center (cx/cy)
    if (ob.cx !== undefined && ob.cy !== undefined) return { x:ob.cx, y:ob.cy };
    const cx = (ob.x ?? 0) + (ob.w ? ob.w/2 : 0);
    const cy = (ob.y ?? 0) + (ob.h ? ob.h/2 : 0);
    return { x:cx, y:cy };
  }

  _nudge(ob, dx, dy){
    if (ob.cx !== undefined){ ob.cx += dx; } else if (ob.x !== undefined){ ob.x += dx; }
    if (ob.cy !== undefined){ ob.cy += dy; } else if (ob.y !== undefined){ ob.y += dy; }
  }

  _spawnExplosion(x, y, life=0.7){
    this.fx.explosions.push({ x, y, t:0, r: 46 + Math.random()*22, life });
    // giới hạn số lượng để an toàn
    if (this.fx.explosions.length > 40) this.fx.explosions.splice(0, this.fx.explosions.length-40);
  }

  _spawnSnow(n){
    const W=this.app.logicWidth, H=this.app.logicHeight;
    for (let i=0;i<n;i++){
      this.fx.snow.push({
        x: Math.random()*W,
        y: -10 - Math.random()*H*0.4,
        vx: (-10 + Math.random()*20),
        vy: (20 + Math.random()*25),
        life: 1.2 + Math.random()*1.2
      });
    }
    if (this.fx.snow.length > 40) this.fx.snow.splice(0, this.fx.snow.length-40);
  }
}
