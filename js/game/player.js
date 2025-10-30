// Funny Human Player — hỗ trợ skin đẹp & đổi ngay
// Skins gốc: "skin.player.blue", "skin.player.red", "skin.player.panda"
// NEW: "skin.player.yakuza" (kính + gậy bóng chày), "skin.player.superman" (cape + logo S)

export class Player {
  constructor(app) {
    this.app = app;
    this.w = 44;
    this.h = 96;
    this.x = (app.logicWidth - this.w) / 2;
    this.y = app.logicHeight - this.h - 24;
    this.speed = 260;

    this.pose = "idle";       // idle | leanL | leanR | slip | taunt
    this.poseTimer = 0;

    this.blink = 0;           // mắt chớp trong 100ms
    this.tBlink = this._rand(1.2, 2.4);

    this.bubbleText = "";
    this.bubbleTimer = 0.0;

    this.t = 0;

    // áp dụng skin mặc định
    this.applySkin("skin.player.blue");
  }

  /** Gọi khi người chơi chọn trang phục trong Shop */
  applySkin(skinId){
    this.skinId = skinId;
    // bảng màu cho từng bộ
    if (skinId === "skin.player.red"){
      this.skin = {
        body:"#ffe0b8", suit:"#ff7a7a", trim:"#2B2D42",
        face:"#2B2D42", accent:"#ffd0d0", panda:false
      };
    } else if (skinId === "skin.player.panda"){
      this.skin = {
        body:"#ffe6cc", suit:"#ffffff", trim:"#1f2937",
        face:"#111",     accent:"#d1d5db", panda:true, ear:"#111", patch:"#222"
      };
    } else if (skinId === "skin.player.yakuza"){
      this.skin = {
        body:"#ffe0b8", suit:"#111111", trim:"#b70000",
        face:"#2B2D42", accent:"#5a0000", panda:false, yakuza:true
      };
    } else if (skinId === "skin.player.superman"){
      this.skin = {
        body:"#ffe0b8", suit:"#2f6df6", trim:"#c51e1e",
        face:"#2B2D42", accent:"#ffd34d", panda:false, superman:true
      };
    } else { // blue default
      this.skin = {
        body:"#ffe0b0", suit:"#63d7d1", trim:"#2B2D42",
        face:"#2B2D42", accent:"#bdf6f1", panda:false
      };
    }
  }

  centerX(){ return this.x + this.w/2; }

  setPoseTemp(pose, sec=0.6){
    this.pose = pose;
    this.poseTimer = Math.max(this.poseTimer, sec);
  }
  taunt(text){ this.bubbleText = text || ""; this.bubbleTimer = 0.9; this.setPoseTemp("taunt", 0.6); }
  slip(){ this.setPoseTemp("slip", 0.4); }

  update(dt, vx){
    this.t += dt;

    // blink
    this.tBlink -= dt;
    if (this.tBlink <= 0){ this.blink = 0.10; this.tBlink = this._rand(1.2, 2.4); }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt);

    // bubble timer
    if (this.bubbleTimer > 0) this.bubbleTimer = Math.max(0, this.bubbleTimer - dt);

    // move
    this.x += vx * this.speed * dt;
    const L = 0, R = this.app.logicWidth - this.w;
    if (this.x < L) this.x = L;
    if (this.x > R) this.x = R;

    // pose auto
    if (this.poseTimer > 0) this.poseTimer = Math.max(0, this.poseTimer - dt);
    if (this.poseTimer === 0){
      if (vx < -0.2) this.pose = "leanL";
      else if (vx > 0.2) this.pose = "leanR";
      else this.pose = "idle";
    }
  }

  // ========== VẼ NHÂN VẬT ========== //
  render(ctx){
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const s = this.skin;

    // bóng đổ
    ctx.save();
    const shadowPulse = 0.02*Math.sin(this.t*6);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x+w*0.5, y+h-6, w*(0.70+shadowPulse), 8, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // tham số
    const headR   = Math.floor(w*0.55);
    const torsoW  = Math.floor(w*0.68);
    const torsoH  = Math.floor(h*0.40);
    const neckY   = y + Math.floor(h*0.18);
    const headCX  = x + w/2;
    const headCY  = neckY - headR + 2;
    const torsoX  = x + (w - torsoW)/2;
    const torsoY  = neckY;
    const hipY    = torsoY + torsoH;
    const legLen  = Math.floor(h*0.36);
    const armLen  = Math.floor(h*0.28);

    // biến đổi theo pose
    let bodyRot = 0, bodyTX = 0, bodyTY = 0;
    if (this.pose === "leanL") { bodyRot = -0.10; bodyTX = -6; }
    if (this.pose === "leanR") { bodyRot =  0.10; bodyTX =  6; }
    if (this.pose === "slip")  { bodyRot =  0.60; bodyTY =  6; }
    if (this.pose === "taunt") { bodyRot =  0.00; bodyTY = -2; }

    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    ctx.rotate(bodyRot);
    ctx.translate(bodyTX, bodyTY);
    ctx.translate(-w/2, -h/2);

    // +++ CAPE cho superman (vẽ TRƯỚC thân để cape ở phía sau)
    if (s.superman){
      ctx.save();
      ctx.fillStyle = "#c51e1e";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      const capeTopX = (torsoX-(x)) + torsoW*0.5, capeTopY = (torsoY-(y)) + 6;
      ctx.moveTo(capeTopX, capeTopY);
      // nhẹ nhàng đung đưa
      const swing = Math.sin(this.t*3) * 8;
      ctx.lineTo(capeTopX - 20 - swing*0.2, capeTopY + 52);
      ctx.lineTo(capeTopX + 24 + swing*0.1, capeTopY + 56);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // THÂN (áo)
    ctx.save();
    ctx.fillStyle   = s.suit;
    ctx.strokeStyle = s.trim;
    ctx.lineWidth   = 3;
    this._roundRect(ctx, torsoX-(x), torsoY-(y), torsoW, torsoH, 10);
    ctx.fill(); ctx.stroke();

    // viền/đai ngực (accent)
    ctx.fillStyle = s.accent;
    ctx.fillRect(torsoX-(x)+8, torsoY-(y)+Math.floor(torsoH*0.35), torsoW-16, 10);

    // Logo S tối giản cho superman
    if (s.superman){
      ctx.save();
      const cx = torsoX-(x) + torsoW*0.5, cy = torsoY-(y) + torsoH*0.44;
      ctx.translate(cx, cy);
      ctx.scale(0.5, 0.5);
      // viền kim cương
      ctx.fillStyle = "#ffd34d"; // vàng
      ctx.strokeStyle = s.trim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(18, 0); ctx.lineTo(0, 16); ctx.lineTo(-18, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // chữ S tối giản
      ctx.strokeStyle = "#c51e1e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10,-4); ctx.bezierCurveTo(-2,-12, 10,-10, 10,-2);
      ctx.bezierCurveTo(10,6, -4,6, -8,12);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // ĐẦU
    ctx.save();
    ctx.fillStyle = s.body;
    ctx.strokeStyle = s.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headCX-(x), headCY-(y), headR, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // mắt + miệng
    // nếu yakuza + kính: mắt sẽ bị kính phủ; vẫn giữ chớp để có cảm giác sống => chỉ chớp qua phần kính
    const drawEyes = ()=>{
      ctx.fillStyle = s.face;
      const eyeW = 5, eyeH = (this.blink>0 ? 2 : 6);
      ctx.fillRect(headCX-(x) - headR*0.45, headCY-(y) - 4, eyeW, eyeH);
      ctx.fillRect(headCX-(x) + headR*0.45 - eyeW, headCY-(y) - 4, eyeW, eyeH);
    };
    // miệng
    const drawMouth = ()=>{
      ctx.strokeStyle = s.face; ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (this.pose === "slip"){
        this._arcMouth(ctx, headCX-(x), headCY-(y)+headR*0.42, headR*0.40, 1.1*Math.PI, 1.9*Math.PI, true);
      } else if (this.pose === "taunt"){
        this._arcMouth(ctx, headCX-(x), headCY-(y)+headR*0.42, headR*0.42, 0.1*Math.PI, 0.9*Math.PI, false);
      } else {
        ctx.moveTo(headCX-(x)-headR*0.35, headCY-(y)+headR*0.42);
        ctx.lineTo(headCX-(x)+headR*0.35, headCY-(y)+headR*0.42);
      }
      ctx.stroke();
    };

    if (s.yakuza){
      // Kính đen (sunglasses) – phủ ngang mắt
      const gW = headR*1.2, gH = 10;
      const gx = headCX-(x) - gW/2, gy = headCY-(y) - 5;
      // gọng kính
      ctx.fillStyle = "#0a0a0a";
      this._roundRect(ctx, gx, gy, gW, gH, 4); ctx.fill();
      // highlight nhẹ
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      this._roundRect(ctx, gx+4, gy+2, gW-8, 3.2, 3); ctx.fill();
      // càng kính
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(gx-6, gy+2, 6, 3);
      ctx.fillRect(gx+gW, gy+2, 6, 3);
      // mắt chớp phía dưới lớp kính (tạo cảm giác sống)
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      drawEyes();
      ctx.restore();
      drawMouth();
    } else {
      drawEyes();
      drawMouth();
    }
    ctx.restore();

    // TAY
    ctx.save();
    ctx.strokeStyle = s.trim;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    const shoulderL = { x: torsoX-(x) + 8,          y: torsoY-(y) + 14 };
    const shoulderR = { x: torsoX-(x) + torsoW - 8, y: torsoY-(y) + 14 };
    let armL = { dx:-armLen*0.55, dy:  armLen*0.05 };
    let armR = { dx: armLen*0.55, dy:  armLen*0.05 };
    if (this.pose === "leanL"){ armL = { dx:-armLen*0.75, dy:-armLen*0.15 }; armR = { dx: armLen*0.45, dy: armLen*0.15 }; }
    if (this.pose === "leanR"){ armL = { dx:-armLen*0.45, dy: armLen*0.15 }; armR = { dx: armLen*0.75, dy:-armLen*0.15 }; }
    if (this.pose === "slip"){  armL = { dx:-armLen*0.50, dy: armLen*0.30 }; armR = { dx: armLen*0.70, dy: armLen*0.40 }; }
    if (this.pose === "taunt"){ armL = { dx:-armLen*0.15, dy:-armLen*0.60 }; armR = { dx: armLen*0.15, dy:-armLen*0.60 }; }
    this._limb(ctx, shoulderL.x, shoulderL.y, shoulderL.x + armL.dx, shoulderL.y + armL.dy);
    this._limb(ctx, shoulderR.x, shoulderR.y, shoulderR.x + armR.dx, shoulderR.y + armR.dy);
    ctx.fillStyle = s.trim;
    const handL = { x: shoulderL.x + armL.dx, y: shoulderL.y + armL.dy };
    const handR = { x: shoulderR.x + armR.dx, y: shoulderR.y + armR.dy };
    this._dot(ctx, handL.x, handL.y, 4.2);
    this._dot(ctx, handR.x, handR.y, 4.2);

    // GẬY BÓNG CHÀY (Yakuza) – gắn vào tay phải
    if (s.yakuza){
      ctx.save();
      // vị trí/rotation gậy theo pose để “ngầu” hơn
      let angle = 0.20;
      if (this.pose === "leanL") angle = -0.10;
      if (this.pose === "leanR") angle =  0.35;
      if (this.pose === "slip")  angle =  0.60;
      if (this.pose === "taunt") angle =  0.10;

      ctx.translate(handR.x, handR.y);
      ctx.rotate(angle);
      // thân gậy
      ctx.fillStyle = "#caa472";  // gỗ
      ctx.strokeStyle = "#2B2D42";
      ctx.lineWidth = 2;
      const batLen = 28, batW = 6;
      this._roundRect(ctx, -batLen*0.9, -batW/2, batLen, batW, 3);
      ctx.fill(); ctx.stroke();
      // đầu gậy lớn hơn chút
      ctx.beginPath(); ctx.ellipse(-batLen*0.9, 0, 4.6, 6.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // băng quấn tay cầm
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-batLen*0.15, -batW/2, batLen*0.15, batW);
      ctx.restore();
    }
    ctx.restore();

    // CHÂN
    ctx.save();
    ctx.strokeStyle = s.trim;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    const hipL = { x: torsoX-(x) + torsoW*0.35, y: hipY-(y) };
    const hipR = { x: torsoX-(x) + torsoW*0.65, y: hipY-(y) };
    let legL = { dx:-legLen*0.10, dy: legLen };
    let legR = { dx: legLen*0.10, dy: legLen };
    if (this.pose === "leanL"){ legL = { dx:-legLen*0.18, dy: legLen }; legR = { dx: legLen*0.02, dy: legLen }; }
    if (this.pose === "leanR"){ legL = { dx:-legLen*0.02, dy: legLen }; legR = { dx: legLen*0.18, dy: legLen }; }
    if (this.pose === "slip"){  legL = { dx:-legLen*0.40, dy: legLen*0.90 }; legR = { dx: legLen*0.55, dy: legLen*0.75 }; }
    if (this.pose === "taunt"){ legL = { dx:-legLen*0.12, dy: legLen }; legR = { dx: legLen*0.12, dy: legLen }; }
    this._limb(ctx, hipL.x, hipL.y, hipL.x + legL.dx, hipL.y + legL.dy);
    this._limb(ctx, hipR.x, hipR.y, hipR.x + legR.dx, hipR.y + legR.dy);
    ctx.lineWidth = 4;
    this._foot(ctx, hipL.x + legL.dx, hipL.y + legL.dy, -1);
    this._foot(ctx, hipR.x + legR.dx, hipR.y + legR.dy,  1);
    ctx.restore();

    ctx.restore();

    // bubble
    if (this.bubbleTimer > 0 && this.bubbleText){
      this._speechBubble(ctx, this.centerX(), y + h*0.18, this.bubbleText);
    }
  }

  // ===== helpers =====
  _roundRect(ctx, x, y, w, h, r){ const rr=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
  _arcMouth(ctx, cx, cy, r, a0, a1, ccw=false){ ctx.moveTo(cx + r*Math.cos(a0), cy + r*Math.sin(a0)); ctx.arc(cx, cy, r, a0, a1, ccw); }
  _limb(ctx, x0, y0, x1, y1){ ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); }
  _dot(ctx, x, y, r){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
  _foot(ctx, x, y, dir=1){ ctx.beginPath(); ctx.moveTo(x - 8*dir, y); ctx.lineTo(x + 10*dir, y); ctx.stroke(); }
  _speechBubble(ctx, x, y, text){
    ctx.save();
    ctx.font = "14px system-ui, sans-serif";
    const padX=10, padY=6; const w = Math.min(220, Math.max(40, ctx.measureText(text).width + padX*2));
    const h = 28, r = 10;
    const bx = Math.max(6, Math.min(this.app.logicWidth - w - 6, x - w/2));
    const by = Math.max(6, y - h - 24);
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.strokeStyle = "#2B2D42"; ctx.lineWidth=2;
    this._roundRect(ctx, bx, by, w, h, r); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-4, by+h); ctx.lineTo(x+4, by+h); ctx.lineTo(x, by+h+8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2B2D42"; ctx.fillText(text, bx+padX, by + h/2 + 5);
    ctx.restore();
  }
  _rand(a,b){ return a + Math.random()*(b-a); }
}
