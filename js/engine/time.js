export class Time {
  constructor(){ this.reset(); }
  step(){
    const n = performance.now();
    let dt = (n - this._last) / 1000;
    this._last = n;
    return Math.min(dt, 1/30); // clamp 33ms để tránh giật
  }
  reset(){ this._last = performance.now(); }
}
