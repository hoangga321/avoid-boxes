// Obstacles có hỗ trợ style "neon" (phát sáng) để dùng với skin.obstacle.neon
export class Obstacle {
  constructor(x, y, size, vy, skin="box", style="normal"){
    this.x=x; this.y=y; this.w=size; this.h=size; this.vy=vy;
    this.skin=skin;
    this.style = style;  // "normal" | "neon"
    this._out=false; this._hitChecked=false;

    // ====== ANIM STATE cho skin động (orc blink | slime wobble) ======
    this.anim = {
      t: 0,
      // Blink cho orc: mỗi 2.2–4.5s chớp 90–150ms
      blinkTimer: rand(2.2, 4.5),
      blinkDur: 0,
      blinking: false,
      // Lườm (pupil glance)
      glanceT: Math.random() * Math.PI * 2,
      // Wobble cho slime
      wobblePhase: Math.random() * Math.PI * 2
    };
  }

  setStyle(style){ this.style = style || "normal"; }

  update(dt, logicHeight){
    this.y += this.vy * dt;
    if (this.y > logicHeight + this.h) this._out = true;

    // Tick anim
    this.anim.t += dt;
    // Blink (orc)
    this.anim.blinkTimer -= dt;
    if (this.anim.blinkTimer <= 0 && !this.anim.blinking){
      this.anim.blinking = true;
      this.anim.blinkDur = rand(0.09, 0.15);
      this.anim.blinkTimer = rand(2.2, 4.5);
    }
    if (this.anim.blinking){
      this.anim.blinkDur -= dt;
      if (this.anim.blinkDur <= 0) this.anim.blinking = false;
    }
    // Glance
    this.anim.glanceT += dt * 1.2;
    // Wobble
    this.anim.wobblePhase += dt * 6.0;
  }

  render(ctx){
    const {x,y,w,h} = this;
    ctx.save();

    // bóng mờ dưới
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(x+w/2, y+h+4, w*0.45, h*0.12, 0, 0, Math.PI*2); ctx.fill();

    // Neon style
    const neon = (this.style === "neon");
    if (neon){
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#22d3ee";
    } else {
      ctx.shadowBlur = 0;
    }

    // helper vẽ mắt (dùng cho nhiều skin)
    const drawEyes = (cx, cy, r=2.6, gap=6, closed=false, pupilOffX=0, pupilOffY=0) => {
      ctx.save();
      ctx.fillStyle = "#111";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      if (closed){
        // vẽ mắt nhắm: 2 đường cong ngắn
        ctx.beginPath(); ctx.moveTo(cx-gap-3, cy); ctx.quadraticCurveTo(cx-gap, cy+2, cx-gap+3, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+gap-3, cy); ctx.quadraticCurveTo(cx+gap, cy+2, cx+gap+3, cy); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx-gap, cy, r, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+gap, cy, r, 0, Math.PI*2); ctx.fill();
        // con ngươi (nhỏ) lườm
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(cx-gap + pupilOffX*0.6, cy + pupilOffY*0.4, r*0.55, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+gap + pupilOffX*0.6, cy + pupilOffY*0.4, r*0.55, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    };

    // Slime wobble transform (áp dụng cho họ slime.*)
    const isSlime = (this.skin === "slime") || this.skin.startsWith?.("slime.");
    if (isSlime){
      const wob = Math.sin(this.anim.wobblePhase) * 0.06; // ±6%
      ctx.translate(x + w/2, y + h/2);
      ctx.scale(1 + wob*0.35, 1 - wob*0.35);
      ctx.translate(- (x + w/2), - (y + h/2));
    }

    switch(this.skin){
      // === ORC HEAD (đầu orc, blink + lườm) ===
      case "orc": {
        // đầu
        ctx.fillStyle = neon ? "#22ff66" : "#3aa652";
        ctx.strokeStyle = "#2B2D42"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x+w/2, y+h/2, w*0.6, 0, Math.PI*2); ctx.fill(); ctx.stroke();

        // tóc lưa thưa (simple spikes)
        ctx.fillStyle = "#2b2d42";
        for(let i=0;i<5;i++){
          const px = x + w*0.25 + i*(w*0.1);
          const py = y + h*0.22;
          ctx.beginPath(); ctx.moveTo(px, py);
          ctx.lineTo(px+6, py-10); ctx.lineTo(px+12, py);
          ctx.closePath(); ctx.fill();
        }

        // mắt + lườm
        const eyeCX = x + w*0.5;
        const eyeCY = y + h*0.5 - 3;
        const closed = this.anim.blinking;
        const pupilOffX = Math.sin(this.anim.glanceT) * 2.0;
        const pupilOffY = Math.cos(this.anim.glanceT*0.7) * 0.6;
        drawEyes(eyeCX, eyeCY, 2.8, 8, closed, pupilOffX, pupilOffY);

        // nanh
        ctx.fillStyle="#fff";
        ctx.beginPath(); ctx.moveTo(x+w*0.5 - 9, y+h*0.5 + 8); ctx.lineTo(x+w*0.5 - 3, y+h*0.5 + 14); ctx.lineTo(x+w*0.5 - 7, y+h*0.5 + 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+w*0.5 + 9, y+h*0.5 + 8); ctx.lineTo(x+w*0.5 + 3, y+h*0.5 + 14); ctx.lineTo(x+w*0.5 + 7, y+h*0.5 + 3); ctx.fill();
        break;
      }

      // === SLIME (3 biến thể + legacy "slime") ===
      case "slime":
      case "slime.green":
      case "slime.devil":
      case "slime.angel": {
        const variant = (this.skin === "slime") ? "green" : this.skin.split(".")[1];
        // màu thân
        let bodyFill = "#7fffb3"; // green default
        if (variant === "devil") bodyFill = neon ? "rgba(255,160,160,.95)" : "#ff9ca1";
        if (variant === "angel") bodyFill = neon ? "rgba(220,255,255,.95)" : "#c9f7ff";

        const W = w*1.12, H = h*0.95;
        ctx.fillStyle = neon ? "rgba(160,255,220,0.95)" : bodyFill;
        ctx.strokeStyle = "#2B2D42"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + (w - W)/2, y + h*0.55);
        ctx.quadraticCurveTo(x + w*0.5, y + h*0.55 - H, x + (w + W)/2, y + h*0.55);
        ctx.quadraticCurveTo(x + w*0.5, y + h*0.55 + H*0.45, x + (w - W)/2, y + h*0.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // mặt
        const eyeCX = x + w*0.5;
        const eyeCY = y + h*0.5 - 8;
        const closed = false;
        const pupilOffX = Math.sin(this.anim.glanceT*0.9) * 1.2;
        drawEyes(eyeCX, eyeCY, 2.2, 7, closed, pupilOffX, 0);

        // miệng nhỏ
        ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(eyeCX-6, eyeCY+8);
        ctx.quadraticCurveTo(eyeCX, eyeCY+11, eyeCX+6, eyeCY+8);
        ctx.stroke();

        // biến thể
        if (variant === "devil"){
          // sừng
          ctx.fillStyle = neon ? "#ff4d4d" : "#d94646";
          const hornY = y + h*0.28;
          ctx.beginPath(); ctx.moveTo(x+w*0.35, hornY); ctx.lineTo(x+w*0.42, hornY-12); ctx.lineTo(x+w*0.47, hornY); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x+w*0.65, hornY); ctx.lineTo(x+w*0.58, hornY-12); ctx.lineTo(x+w*0.53, hornY); ctx.closePath(); ctx.fill();
        }
        if (variant === "angel"){
          // halo
          ctx.strokeStyle = neon ? "#ffe27a" : "#ffd166"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x+w*0.5, y+h*0.25, w*0.22, h*0.08, 0, 0, Math.PI*2); ctx.stroke();
          // cánh nhỏ
          ctx.fillStyle = neon ? "#e0faff" : "#fff";
          // trái
          ctx.beginPath();
          ctx.moveTo(x+w*0.28, y+h*0.42);
          ctx.quadraticCurveTo(x+w*0.20, y+h*0.34, x+w*0.24, y+h*0.48);
          ctx.quadraticCurveTo(x+w*0.26, y+h*0.52, x+w*0.28, y+h*0.42);
          ctx.fill();
          // phải
          ctx.beginPath();
          ctx.moveTo(x+w*0.72, y+h*0.42);
          ctx.quadraticCurveTo(x+w*0.80, y+h*0.34, x+w*0.76, y+h*0.48);
          ctx.quadraticCurveTo(x+w*0.74, y+h*0.52, x+w*0.72, y+h*0.42);
          ctx.fill();
        }
        break;
      }

      // ====== CÁC SKIN CŨ GIỮ NGUYÊN ======
      case "cone": // cọc tiêu
        ctx.fillStyle = neon ? "#fca311" : "#ff9f43";
        ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(x+w*0.5, y); ctx.lineTo(x+w*0.85, y+h); ctx.lineTo(x+w*0.15, y+h);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle= neon ? "#e5fbff" : "#fff"; ctx.fillRect(x+w*0.32, y+h*0.55, w*0.36, 6);
        break;

      case "wheel": // lốp xe
        ctx.fillStyle= neon ? "#0ea5e9" : "#3a5353";
        ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.45,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle= neon ? "#22d3ee" : "#101b1b"; ctx.lineWidth=4; ctx.stroke();
        ctx.fillStyle= neon ? "#e0faff" : "#9ecac7";
        ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.18,0,Math.PI*2); ctx.fill();
        break;

      case "bowl": // tô mì
        ctx.fillStyle= neon ? "#e0faff" : "#fff";
        ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h*0.55, w*0.48, h*0.28, 0, 0, Math.PI, true); ctx.fill(); ctx.stroke();
        ctx.fillStyle= neon ? "#fde68a" : "#ffd166"; ctx.fillRect(x+w*0.2, y+h*0.46, w*0.6, 6);
        break;

      case "steam": // khói nóng
        ctx.strokeStyle= neon ? "#94a3b8" : "#c8b39b"; ctx.lineWidth=4;
        for(let i=0;i<3;i++){
          const ox = x + w*(0.25 + i*0.25), oy = y + h*0.2;
          ctx.beginPath(); ctx.moveTo(ox, oy+h*0.2); ctx.bezierCurveTo(ox-6,oy, ox+6,oy-10, ox,oy-18); ctx.stroke();
        }
        break;

      case "packet": // gói mì
        ctx.fillStyle= neon ? "#fb7185" : "#ff7675"; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(x+6,y); ctx.lineTo(x+w-6,y); ctx.lineTo(x+w,y+h-6); ctx.lineTo(x,y+h-6); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle= neon ? "#e0faff" : "#fff"; ctx.fillRect(x+w*0.25,y+h*0.35,w*0.5,8);
        break;

      case "dumbbell":
        ctx.fillStyle= neon ? "#38bdf8" : "#4a4a4a"; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
        ctx.fillRect(x+w*0.35,y+h*0.25,w*0.3,h*0.5);
        ctx.fillRect(x,y+h*0.15,w*0.25,h*0.7);
        ctx.fillRect(x+w*0.75,y+h*0.15,w*0.25,h*0.7);
        ctx.strokeRect(x,y+h*0.15,w*0.25,h*0.7);
        ctx.strokeRect(x+w*0.75,y+h*0.15,w*0.25,h*0.7);
        break;

      case "kettlebell":
        ctx.fillStyle= neon ? "#38bdf8" : "#5a5a5a"; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(x+w/2,y+h*0.58,w*0.38,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x+w/2,y+h*0.32,w*0.24,Math.PI*0.9,Math.PI*0.1); ctx.stroke();
        break;

      case "medicine":
        ctx.fillStyle= neon ? "#a78bfa" : "#6c5ce7";
        ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.45,0,Math.PI*2); ctx.fill();
        ctx.fillStyle= neon ? "#f0f9ff" : "#fff"; ctx.fillRect(x+w*0.25, y*h*0.45, w*0.5, 6);
        break;

      default: // "box"
        ctx.fillStyle= neon ? "#06b6d4" : "#6dcfc5";
        ctx.strokeStyle= neon ? "#22d3ee" : "#2B2D42"; ctx.lineWidth=3;
        ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
        ctx.fillStyle= neon ? "#002b36" : "#2B2D42";
        ctx.fillRect(x+w*0.25,y+h*0.35,6,6);
        ctx.fillRect(x+w*0.65,y+h*0.35,6,6);
        ctx.fillRect(x+w*0.4,y+h*0.6,w*0.2,4);
    }
    ctx.restore();
  }
}

function rand(a,b){ return a + Math.random()*(b-a); }
