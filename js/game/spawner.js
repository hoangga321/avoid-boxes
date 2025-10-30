import { Obstacle } from "./obstacle.js";

export class Spawner {
  constructor(app, stage){
    this.app = app;
    this.setStage(stage);
    this.t = 0;
    this.elapsed = 0;
    this._cool = 0;

    this.active = true;
    // override skin: "orc" | "slime.green" | "slime.devil" | "slime.angel" | "slime.any"
    this.overrideSkin = null;
  }

  setStage(stage){
    this.stage = stage;
    this.rateBase = stage.spawn.baseRate;
    this.rateUp   = stage.spawn.rateUpPerMin;
    this.sizeMin  = stage.spawn.sizeMin;
    this.sizeMax  = stage.spawn.sizeMax;
    this.speedMin = stage.spawn.speedMin;
    this.speedMax = stage.spawn.speedMax;
  }

  setActive(on){ this.active = !!on; }
  setOverrideSkin(name){ this.overrideSkin = name || null; }

  reset(){ this.t = 0; this.elapsed = 0; this._cool = 0; }

  update(dt){
    if (!this.active) return;
    this.t += dt;
    this.elapsed += dt;
    const minutes = this.elapsed / 60;
    this.curRate = this.rateBase + this.rateUp * minutes;
    this.curRate = Math.min(this.curRate, this.rateBase + this.rateUp*3);
    this._cool -= dt;
  }

  trySpawn(list){
    if (!this.active) return;
    while (this._cool <= 0){
      const w = this.app.logicWidth;
      const size = rand(this.sizeMin, this.sizeMax);
      const x = rand(8, w - size - 8);
      const y = -size - 10;
      const vy = rand(this.speedMin, this.speedMax);

      const set = this.stage.obstacleSet;
      let skin = this.overrideSkin;

      if (!skin){
        skin = set[Math.floor(Math.random()*set.length)];
      } else if (skin === "slime.any"){
        const pool = ["slime.green","slime.devil","slime.angel"];
        skin = pool[Math.floor(Math.random()*pool.length)];
      }

      list.push(new Obstacle(x,y,size,vy,skin));

      const secPer = 1 / this.curRate;
      this._cool += secPer * rand(0.7, 1.3);
    }
  }
}

function rand(a,b){ return a + Math.random()*(b-a); }
