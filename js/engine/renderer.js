// js/engine/renderer.js
export function initRenderer(app) {
  app.scale = 1;
  const ctx = app.ctx;
  ctx.imageSmoothingEnabled = false;
}

export function onResize(app) {
  const stage = app.canvas.parentElement; // .game-stage
  const rect  = stage.getBoundingClientRect();
  const dpr   = window.devicePixelRatio || 1;

  // Scale để khớp trong khung
  const sx = rect.width  / app.logicWidth;
  const sy = rect.height / app.logicHeight;
  const scale = Math.max(0.1, Math.min(sx, sy));

  // Backing store
  app.canvas.width  = Math.floor(app.logicWidth  * scale * dpr);
  app.canvas.height = Math.floor(app.logicHeight * scale * dpr);

  // CSS size
  app.canvas.style.width  = `${Math.floor(app.logicWidth  * scale)}px`;
  app.canvas.style.height = `${Math.floor(app.logicHeight * scale)}px`;

  app.dpr = dpr;
  app.scale = scale;

  const ctx = app.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.clearRect(0, 0, app.logicWidth, app.logicHeight);
}
