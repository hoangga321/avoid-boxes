import { Time } from "../engine/time.js";
import { Spawner } from "./spawner.js";
import { aabbIntersect, nearMiss } from "../engine/collision.js";
import { Scoring } from "./scoring.js";
import { Player } from "./player.js";
import { STAGES, getStageById } from "./stages.js";
import { renderBackground } from "./background.js";
import { getLevel } from "./levels.js";
import { loadProgress, addRewards } from "../data/progress.js";
import { Powerups } from "./powerups.js";
import { BossManager } from "./bosses.js";
import { addRecord } from "../ui/leaderboard.js";

export class Game{
  constructor(app, hud, ui, i18n){
    this.progress = loadProgress();

    this.app = app; this.hud = hud; this.ui = ui; this.i18n = i18n;
    this.state   = "START";
    this.timeSys = new Time();

    this.scoring = new Scoring();
    this.player  = new Player(app);
    this.power   = new Powerups(app, hud);

    // Stage & Parallax
    this.stage = STAGES[0];
    this.spawner = new Spawner(app, this.stage);
    this._initParallax();

    // Levels / Missions
    this.levelIdx = 0;
    this._applyLevel();
    this.nearCount = 0;

    // Boss
    this.boss = new BossManager(app);
    this.bossTimer = 0;
    this.bossIntro = 0;
    this._pendingBossType = null;

    // Powerup token
    this._puSpawn  = { t: 3.0, interval: [9, 13] };
    this._puTokens = [];

    this.debugOn = false;
    window.addEventListener("keydown", (e)=>{
      if(e.key === "F1"){ this.debugOn = !this.debugOn; e.preventDefault(); }
      // NEW: nếu đang focus vào nút leaderboard thì bỏ focus khi bấm phím
      const lbBtn = document.getElementById("btnLeaderboard");
      if (lbBtn && document.activeElement === lbBtn) lbBtn.blur();
    });

    ui.showStart(true);
    this.hud.setBest(this.scoring.best);
    this.hud.setSessionCoins(0);
    this.hud.setBossTimer?.(0);

    // mặc định style obstacle
    this.obstacleStyle = "normal";
  }

  applyEquip(equip){
    // Player skin
    this.player?.applySkin?.(equip?.player || "skin.player.blue");

    // Obstacle style (neon/normal)
    this.obstacleStyle = (equip?.obstacle === "skin.obstacle.neon") ? "neon" : "normal";
    if (this.obstacles){
      for (const ob of this.obstacles){ ob.setStyle?.(this.obstacleStyle); }
    }

    // override skin
    const obsId = equip?.obstacle || "skin.obstacle.pastel";
    const overrideMap = {
      "skin.obstacle.orc":           "orc",
      "skin.obstacle.slime":         "slime.any",
      "skin.obstacle.slime.green":   "slime.green",
      "skin.obstacle.slime.devil":   "slime.devil",
      "skin.obstacle.slime.angel":   "slime.angel",
    };
    const override = overrideMap[obsId] || null;
    this.spawner?.setOverrideSkin?.(override);
  }

  setStageById(id){
    this.stage = getStageById(id);
    this.spawner.setStage(this.stage);
    this._initParallax();
    this.levelIdx = 0;
    this._applyLevel();
  }

  _initParallax(){
    this.bgColor = this.stage.bg;
    this.par = this.stage.parallax.map(() => 0);
  }

  _applyLevel(){
    const L = getLevel(this.stage.id, this.levelIdx);
    this.level = L;
    this.goalTime = L.goalTimeSec;
    this.nearGoal = L.bonusNearMiss;
    this.nearCount = 0;
    this._emitMission();
  }

  _emitMission(){
    if (typeof this.onMission === "function"){
      this.onMission({
        levelIdx: this.level.idx,
        levelTotal: this.level.total,
        goalTimeSec: this.goalTime,
        timeElapsed: this.scoring?.time || 0,
        nearMiss: this.nearCount,
        nearTarget: this.nearGoal,
      });
    }
  }

  _nextLevel(){
    const lastIdx = getLevel(this.stage.id, 999).idx;
    this.levelIdx = Math.min(this.levelIdx+1, lastIdx);
    this.scoring.time = 0;
    this.obstacles = [];
    this.spawner.reset();
    this._applyLevel();
    this.hud.showToast(this.i18n.lang==="ko" ? "클리어! 다음 레벨" : "Cleared! Next level", 1400);
    this.app.audio?.sfxStart();
    this.sessionLevels += 1;
    this._bumpDaily("d.clear1", 1);

    // bật lại token & chơi tiếp
    this._puSpawn.t = 2.0;
    this.hud.setBossTimer?.(0);
    this.state = "RUN";
    this.app.audio?.musicDuck(false);
  }

  start(){
    this.state = "RUN";
    this.scoring.reset();

    // NEW: Fix sticky input – xoá mọi phím đang giữ & focus canvas
    const keys = this.app.keys || {};
    for (const k in keys) keys[k] = false;
    this.app.canvas?.focus?.();

    this.player = new Player(this.app);
    this.obstacles = [];
    this.spawner.reset();
    this._initParallax();

    this._puTokens = [];
    this._puSpawn.t = 2.5;
    this.hud.setPowerStock?.(this.power.stock, this.power.active);

    this.levelIdx = 0;
    this._applyLevel();

    this.ui.showStart(false);
    this.ui.showPause(false);
    this.ui.showCountdown(false);
    this.ui.showGameOver(false);
    this.hud.hideToast();
    this.timeSys.reset();

    this.applyEquip?.(this.progress?.equip);
    this.sessionNear = 0;
    this.sessionLevels = 0;

    this.hud.setTime(0); this.hud.setScore(0); this.hud.setBest(this.scoring.best);
    this.hud.setSessionCoins(0);
    this.hud.setBossTimer?.(0);

    this.app.audio?.sfxStart();
    this.app.audio?.musicStart();
    this.app.audio?.musicDuck(false);

    this.onProgressChange?.(this.progress);
  }
  restart(){ this.start(); }

  togglePause(){
    if(this.state==="RUN"){
      this.state="PAUSE"; this.ui.showPause(true);
      this.hud.hideToast();
      this.app.audio?.sfxPause(); this.app.audio?.musicDuck(true);
    } else if(this.state==="PAUSE"){
      this.state="COUNTDOWN";
      this.countRemain = 3; this.countTick = 1.0;
      this.ui.setCountNum(this.countRemain);
      this.ui.showPause(false); this.ui.showCountdown(true);
      this.app.audio?.sfxBeep();
    }
  }

  // ====== BOSS PHASE ======
  _enterBoss(){
    const type = (this.levelIdx === 0) ? "ufo" : (this.levelIdx === 1 ? "thunder" : "dragon");
    this.hud.showBossWarning?.(type, 1600);
    this.spawner.setActive(false);
    this.obstacles = [];
    this._puTokens = [];
    this._puSpawn.t = 1e9;
    this._pendingBossType = type;
    this.bossIntro  = 1.6;
    this.bossTimer  = 10.0;
    this.state = "BOSS_INTRO";
    this.app.audio?.musicDuck(true);
  }

  _tBossName(type){
    if (this.i18n.lang==="ko"){
      return type==="ufo" ? "보스: UFO"
           : type==="thunder" ? "보스: 천둥"
           : "보스: 드래곤";
    }
    return type==="ufo" ? "Boss: UFO"
         : type==="thunder" ? "Boss: Thunder"
         : "Boss: Dragon";
  }

  _exitBoss(success=true){
    this.hud.setBossTimer?.(0);
    this.boss.clear();
    this.spawner.setActive(true);
    this._puSpawn.t = 2.0;
    this.app.audio?.musicDuck(false);

    if (success){
      this._nextLevel();
    } else {
      this.gameOver();
    }
  }

  // --- giữ nguyên gameOver(), update(), các helper khác ---
  gameOver(){
    this.state = "GAMEOVER";
    this.hud.hideToast();

    const time  = this.scoring.time;
    const coins = Math.round(time/2) + this.sessionNear*2 + this.sessionLevels*5;
    const xp    = Math.round(time)   + this.sessionNear*3 + this.sessionLevels*8;

    addRewards(this.progress, { coins, xp });
    this.lastReward = { coins, xp, totalCoins: this.progress.coins, totalXp: this.progress.xp };
    this.onProgressChange?.(this.progress);

    this.hud.setSessionCoins(0);

    const isNew = this.scoring.finishAndCheckBest();
    this.ui.setFinal(this.scoring.time, this.scoring.best, isNew, this.lastReward);

    try {
      let name = localStorage.getItem("avoidboxes.player_name") || "";
      if (!name){
        name = (this.i18n?.lang==="ko"
          ? (prompt("이름을 입력하세요:", "PLAYER") || "PLAYER")
          : (prompt("Enter your name:", "PLAYER") || "PLAYER"));
        localStorage.setItem("avoidboxes.player_name", name);
      }
      const lb = addRecord({
        name,
        score:  this.scoring.score,
        timeSec: Number(this.scoring.time.toFixed(1)),
        stageId: this.stage?.id || "unknown"
      });
      this.ui.setLeaderboard?.(lb);
    } catch (_) {}

    this.ui.showGameOver(true);
    this.hud.setBest(this.scoring.best);

    this.app.audio?.sfxHit();
    this.app.audio?.musicStop();
  }

  update(dt){
    if(this.state==="RUN"){
      const slow    = this.power.slowFactor();
      const dtLogic = dt * slow;
      this.power.update(dt, this);
      const nowFreeze = this.power.active.freeze?.on;
      if (this._freezeDuck !== nowFreeze){
        this._freezeDuck = nowFreeze;
        this.app.audio?.musicDuck(!!nowFreeze);
      }

      this.scoring.update(dt);
      this.hud.setTime(this.scoring.time);
      this.hud.setScore(this.scoring.score);
      this.hud.setCombo(this.scoring.comboCount, this.scoring.multiplier(), this.scoring.comboFrac());

      const runCoins = Math.round(this.scoring.time/2) + this.sessionNear*2 + this.sessionLevels*5;
      this.hud.setSessionCoins(runCoins);

      this._emitMission();
      this._tickSurvive(dt);

      const k = this.app.keys || {};
      let vx = 0;
      if(k["ArrowLeft"] || k["a"] || k["A"])  vx -= 1;
      if(k["ArrowRight"]|| k["d"] || k["D"])  vx += 1;
      this.player.update(dtLogic, vx);

      if (k["1"]) this.power.trigger("magnet");
      if (k["2"]) this.power.trigger("shield");
      if (k["3"] && this.power.trigger("bomb")){
        const cleared = this.power.onBombClear(this.obstacles||[]);
        if (cleared>0) this.app.audio?.sfxNearMiss?.();
      }
      if (k["4"]) this.power.trigger("freeze");

      for (let i=0;i<this.par.length;i++){
        this.par[i] += this.stage.parallax[i].speed * dt;
      }

      this.spawner.update(dtLogic);
      this.spawner.trySpawn(this.obstacles || (this.obstacles = []));

      const targetStyle = this.obstacleStyle || "normal";
      for (const ob of this.obstacles) if (ob.style !== targetStyle) ob.setStyle?.(targetStyle);
      for (const ob of this.obstacles) ob.update(dtLogic, this.app.logicHeight);

      this._puSpawn.t -= dt;
      if (this._puSpawn.t <= 0){
        const types = ["magnet","shield","bomb","freeze"];
        const type = types[Math.floor(Math.random()*types.length)];
        const x = Math.random() * (this.app.logicWidth - 40) + 20;
        this._puTokens.push({ x, y:-20, vy: 60, type });
        const [a,b] = this._puSpawn.interval;
        this._puSpawn.t = a + Math.random()*(b-a);
      }
      for (const t of this._puTokens){ t.y += 60 * dtLogic; }
      this._puTokens = this._puTokens.filter(t=>{
        const hit = Math.abs(t.x - this.player.x) < (this.player.w*0.5) &&
                    Math.abs(t.y - this.player.y) < (this.player.h*0.5);
        if (hit){ this.power.add(t.type, 1); this.app.audio?.sfxBeep?.(); return false; }
        return t.y < (this.app.logicHeight + 20);
      });

      for (const ob of this.obstacles){
        if (aabbIntersect(this.player, ob)){
          if (this.power.tryShieldConsume()){
            ob._out = true;
            this.player.slip();
            this.app.audio?.sfxNearMiss?.();
          } else {
            this.player.slip();
            this.gameOver();
            return;
          }
        }
        if (!ob._hitChecked && nearMiss(this.player, ob, 8)){
          ob._hitChecked = true;
          this.scoring.addNearMissBonus(); this.scoring.onNearMiss();
          this.hud.setScore(this.scoring.score);
          const quips = (this.i18n.lang==="ko")? ["앗!", "위험!", "휴~", "피했다!"]: ["Yikes!","Close!","Whew!","Dodged!"];
          this.player.taunt(quips[Math.floor(Math.random()*quips.length)]);
          this.nearCount += 1;
          this.sessionNear += 1;
          this._emitMission();
          this.app.audio?.sfxNearMiss();
          this._bumpNear(1);
        }
      }
      this.obstacles = this.obstacles.filter(o=>!o._out);

      if (this.scoring.time >= this.goalTime && this.nearCount >= this.nearGoal){
        this._enterBoss();
        return;
      }

    } else if (this.state==="BOSS_INTRO"){
      this.bossIntro -= dt;
      this._puTokens = [];
      this._puSpawn.t = 1e9;

      if (this.bossIntro <= 0){
        if (this._pendingBossType){
          this.boss.start(this._pendingBossType);
          this._pendingBossType = null;
        }
        this.state = "BOSS";
      }

    } else if (this.state==="BOSS"){
      const slow    = this.power.slowFactor();
      const dtLogic = dt * slow;

      this._puTokens = [];
      this._puSpawn.t = 1e9;

      const k = this.app.keys || {};
      let vx = 0;
      if(k["ArrowLeft"] || k["a"] || k["A"])  vx -= 1;
      if(k["ArrowRight"]|| k["d"] || k["D"])  vx += 1;
      this.player.update(dtLogic, vx);

      this.boss.update(dtLogic, this);
      if (this.boss.hitPlayer(this.player)){
        if (this.power.tryShieldConsume()){
          this.player.slip();
          this.app.audio?.sfxNearMiss?.();
        } else {
          this.player.slip();
          this._exitBoss(false);
          return;
        }
      }

      this.bossTimer -= dt;
      if (this.bossTimer <= 0){
        this._exitBoss(true);
        return;
      }

    } else if (this.state==="COUNTDOWN"){
      this.countTick -= dt;
      if (this.countTick <= 0){
        this.countRemain -= 1; this.countTick += 1.0;
        this.ui.setCountNum(this.countRemain);
        if (this.countRemain>0) this.app.audio?.sfxBeep();
      }
      if (this.countRemain <= 0){
        // NEW: clear input trước khi chuyển sang RUN từ Pause
        const keys = this.app.keys || {};
        for (const k in keys) keys[k] = false;
        this.app.canvas?.focus?.();

        this.state="RUN"; this.ui.showCountdown(false); this.timeSys.reset(); this.app.audio?.musicDuck(false);
      }
    }
  }

  _tickSurvive(dt){
    let changed = false;
    const addTime = (arr)=>{
      if (!arr) return;
      for (const m of arr){
        if (m.rewarded) continue;
        if (m.id.startsWith("d.survive") || m.id.startsWith("w.survive")){
          m.prog = Math.min(m.goal, (m.prog||0) + dt);
          if (m.prog >= m.goal && !m.rewarded){
            m.done = true; m.rewarded = true;
            addRewards(this.progress, m.reward||{});
            changed = true;
            this.hud.showToast(this.i18n.lang==="ko" ? "+코인 보상!" : "+Coin reward!", 900);
          }
        }
      }
    };
    addTime(this.progress.dailies);
    addTime(this.progress.weeklies);
    if (changed) this.onProgressChange?.(this.progress);
  }

  _bumpNear(k){
    let changed = false;
    const addNear = (arr)=>{
      if (!arr) return;
      for (const m of arr){
        if (m.rewarded) continue;
        if (m.id.startsWith("d.near") || m.id.startsWith("w.near")){
          m.prog = Math.min(m.goal, (m.prog||0) + k);
          if (m.prog >= m.goal && !m.rewarded){
            m.done = true; m.rewarded = true;
            addRewards(this.progress, m.reward||{});
            changed = true;
            this.hud.showToast(this.i18n.lang==="ko" ? "+코인 보상!" : "+Coin reward!", 900);
          }
        }
      }
    };
    addNear(this.progress.dailies);
    addNear(this.progress.weeklies);
    if (changed) this.onProgressChange?.(this.progress);
  }

  _bumpDaily(id, k){
    let changed = false;
    const d = this.progress.dailies||[];
    for (const m of d){
      if (m.id === id){
        if (m.rewarded) continue;
        m.prog = Math.min(m.goal, (m.prog||0) + k);
        if (m.prog >= m.goal && !m.rewarded){
          m.done = true; m.rewarded = true;
          addRewards(this.progress, m.reward||{});
          changed = true;
          this.hud.showToast(this.i18n.lang==="ko" ? "+코인 보상!" : "+Coin reward!", 900);
        }
      }
    }
    if (changed) this.onProgressChange?.(this.progress);
  }

  render(){
    const {ctx} = this.app, W=this.app.logicWidth, H=this.app.logicHeight;
    renderBackground(ctx, W, H, this.stage, this.par);

    if (this.state!=="BOSS" && this.state!=="BOSS_INTRO"){
      for (const ob of (this.obstacles||[])) ob.render(ctx);
    }

    if (this.state!=="BOSS" && this.state!=="BOSS_INTRO"){
      for (const t of this._puTokens){
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.fillStyle = "#fff"; ctx.strokeStyle="#000"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#000";
        ctx.font = "bold 12px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        const letter = { magnet:"M", shield:"S", bomb:"B", freeze:"F" }[t.type] || "?";
        ctx.fillText(letter, 0, 1);
        ctx.restore();
      }
    }

    this.player.render(ctx);

    if (this.state==="BOSS" || this.state==="BOSS_INTRO"){
      this.boss.render(ctx);
    }

    this.power.render(ctx, this.player);

    if (this.debugOn) {
      ctx.save(); ctx.strokeStyle = "#ff0066"; ctx.lineWidth = 2; ctx.strokeRect(1,1,W-2,H-2); ctx.restore();
    }
  }
}
