export function initInput(app){
  const keys = {};
  app.keys = keys;

  // Keyboard
  window.addEventListener("keydown", (e)=>{ keys[e.key] = true; });
  window.addEventListener("keyup",   (e)=>{ keys[e.key] = false; });

  // Touch (trái/phải)
  const set = (k,v)=>{ keys[k] = v; };
  const bind = (el, key)=>{
    const on = (ev)=>{ ev.preventDefault(); set(key,true);  };
    const off= (ev)=>{ ev.preventDefault(); set(key,false); };
    el.addEventListener("touchstart", on,  {passive:false});
    el.addEventListener("touchend",   off, {passive:false});
    el.addEventListener("touchcancel",off, {passive:false});
  };
  bind(document.getElementById("touchLeft"),  "ArrowLeft");
  bind(document.getElementById("touchRight"), "ArrowRight");
}
