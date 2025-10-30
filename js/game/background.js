// Vẽ nền parallax theo CHỦ ĐỀ: city / noodle / gym (vector, không cần ảnh)
export function renderBackground(ctx, W, H, stage, offsets){
  // lớp nền phẳng theo tông stage
  ctx.fillStyle = stage.bg;
  ctx.fillRect(0,0,W,H);

  // vẽ từng lớp theo stage.id
  switch(stage.id){
    case "city":   drawCity(ctx, W, H, stage, offsets); break;
    case "noodle": drawNoodle(ctx, W, H, stage, offsets); break;
    case "gym":    drawGym(ctx, W, H, stage, offsets); break;
    default:       drawCity(ctx, W, H, stage, offsets); break;
  }
}

/* ---------- CITY: nhà cao tầng + billboard + mái nhà ---------- */
function drawCity(ctx, W, H, stage, offsets){
  stage.parallax.forEach((layer, i)=>{
    const baseY = H - layer.height;
    const step  = 64;
    const off   = (offsets[i] % step);
    ctx.save();
    ctx.translate(-off, 0);
    for(let x= -step; x < W+step; x += step){
      // nhà xa/gần khác nhau chút
      const hNoise = (i===0? 10: 22) + ((x/step)%3)*4;
      const wBox = step - (i===0? 18 : 12);
      ctx.fillStyle = layer.color;
      ctx.fillRect(x, baseY - hNoise, wBox, layer.height + hNoise);

      // cửa sổ đơn giản cho lớp gần
      if (i===1){
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        for(let yy=baseY - 6; yy < baseY + layer.height - 10; yy += 12){
          ctx.fillRect(x+8, yy, 8, 6);
          ctx.fillRect(x+wBox-18, yy+6, 8, 6);
        }
      }
    }
    ctx.restore();
  });

  // đường chân trời mờ
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(0, H-6, W, 6);
}

/* ---------- NOODLE: phông cửa tiệm + mái che, đèn lồng, hơi nước ---------- */
function drawNoodle(ctx, W, H, stage, offsets){
  // tường tiệm
  ctx.fillStyle = stage.wall || "#f7d7a8";
  ctx.fillRect(0, H - 120, W, 120);

  // mái che sọc
  const stripeH = 24;
  for(let y=H-160; y<H-120; y+=stripeH){
    ctx.fillStyle = (Math.floor((y-(H-160))/stripeH)%2===0) ? (stage.awningA || "#ff7b7b") : (stage.awningB || "#fff1d6");
    ctx.fillRect(0,y,W,stripeH);
  }

  // đèn lồng parallax xa/gần
  stage.parallax.forEach((layer, i)=>{
    const off = offsets[i] % 80;
    ctx.save(); ctx.translate(-off, 0);
    for(let x=-80; x < W+80; x+=80){
      const y = H - 150 + (i===0? -8 : 0);
      lantern(ctx, x+40, y, i===0? 9: 12);
    }
    ctx.restore();
  });

  // hơi nước phía sau
  steamColumn(ctx, W*0.25, H-140, 40);
  steamColumn(ctx, W*0.70, H-140, 46);
}

function lantern(ctx, cx, cy, r){
  ctx.save();
  ctx.fillStyle = "#ffb347"; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.75, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy-r-6); ctx.lineTo(cx, cy-r-14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy+r+6); ctx.lineTo(cx, cy+r+14); ctx.stroke();
  ctx.restore();
}
function steamColumn(ctx, x, y, height){
  ctx.save(); ctx.strokeStyle="rgba(200,170,140,0.55)"; ctx.lineWidth=3;
  for(let i=0;i<3;i++){
    const ox = x + i*10;
    ctx.beginPath();
    ctx.moveTo(ox, y+height);
    ctx.bezierCurveTo(ox-6, y+height-18, ox+10, y+height-28, ox, y);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- GYM: tường gạch + kệ tạ + poster ---------- */
function drawGym(ctx, W, H, stage, offsets){
  // tường gạch
  const wallH = H - 110;
  ctx.fillStyle = stage.wall || "#e1d5c1";
  ctx.fillRect(0, 0, W, wallH);
  // pattern gạch
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  const bw=28,bh=12;
  for(let y=8; y<wallH; y+=bh){
    const shift = (Math.floor(y/bh)%2)* (bw/2);
    for(let x=-shift; x<W; x+=bw){
      ctx.fillRect(x+2,y+2,bw-6, bh-6);
    }
  }
  // sàn
  ctx.fillStyle = stage.floor || "#c6ae8b";
  ctx.fillRect(0, wallH, W, H-wallH);

  // parallax giá tạ
  stage.parallax.forEach((layer,i)=>{
    const off = offsets[i] % 90;
    ctx.save(); ctx.translate(-off,0);
    for(let x=-90; x < W+90; x+=90){
      rack(ctx, x+45, wallH-4 - (i===0? 6:0));
    }
    ctx.restore();
  });

  // poster
  poster(ctx, 28, 28, 90, 60, "#6c5ce7");
  poster(ctx, W-130, 40, 110, 72, "#00b894");
}

function rack(ctx, cx, baseY){
  ctx.save();
  ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
  // khung
  ctx.beginPath();
  ctx.moveTo(cx-24, baseY); ctx.lineTo(cx-24, baseY-48);
  ctx.moveTo(cx+24, baseY); ctx.lineTo(cx+24, baseY-48);
  ctx.stroke();
  // thanh tạ
  ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(cx-30, baseY-36); ctx.lineTo(cx+30, baseY-36); ctx.stroke();
  // bánh tạ
  plate(ctx, cx-34, baseY-36, 10);
  plate(ctx, cx+34, baseY-36, 12);
  ctx.restore();
}
function plate(ctx, x, y, r){
  ctx.save();
  ctx.fillStyle="#4a4a4a"; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#9aa"; ctx.beginPath(); ctx.arc(x,y,r*0.45,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function poster(ctx, x, y, w, h, color){
  ctx.save();
  ctx.fillStyle=color; ctx.strokeStyle="#2B2D42"; ctx.lineWidth=3;
  ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#ffffff99";
  ctx.fillRect(x+8,y+10,w-16,10);
  ctx.fillRect(x+8,y+28,w-16,8);
  ctx.fillRect(x+8,y+44,w-16,8);
  ctx.restore();
}
