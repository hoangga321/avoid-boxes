export class Scoring {
  constructor() {
    this.best = Number(localStorage.getItem("avoid_best") || 0);
    this.comboWindow = 1.8;    // thời gian giữ combo sau 1 near-miss (giây)
    this.reset();
  }
  reset() {
    this.time = 0;
    this.score = 0;
    this._acc = 0;             // tích lũy thời gian để +điểm theo nhịp 0.1s
    this.newBest = false;

    this.comboCount = 0;
    this.comboTimer = 0;       // còn bao nhiêu giây trước khi combo rơi về 0
  }
  update(dt) {
    this.time += dt;

    // decay combo timer
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.comboCount = 0;
    }

    // + điểm theo nhịp 0.1s, nhân multiplier
    this._acc += dt;
    while (this._acc >= 0.1) {
      const add = Math.max(1, Math.round(this.multiplier())); // làm tròn để ra số nguyên đẹp
      this.score += add;
      this._acc -= 0.1;
    }
  }
  // gọi khi suýt chạm (near-miss)
  onNearMiss() {
    this.comboCount += 1;
    this.comboTimer = this.comboWindow;
  }
  addNearMissBonus() { this.score += 5; }

  multiplier() {
    // mỗi 3 near-miss tăng 0.25x, trần 2.0x
    const step = Math.floor(this.comboCount / 3);
    return Math.min(2.0, 1 + step * 0.25);
  }
  comboFrac() {
    return Math.max(0, Math.min(1, this.comboTimer / this.comboWindow));
  }

  finishAndCheckBest() {
    if (this.time > this.best) {
      this.best = this.time;
      localStorage.setItem("avoid_best", String(this.best));
      this.newBest = true;
    } else {
      this.newBest = false;
    }
    return this.newBest;
  }
}
