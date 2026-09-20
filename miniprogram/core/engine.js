(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RideEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'stop-move-0.1.0';
  const DEFAULTS = Object.freeze({ calibrationMs: 2000, enterSpeed: 1.5, exitSpeed: 0.7,
    enterHoldMs: 700, exitHoldMs: 2400, staleMs: 3500, sensorStaleMs: 1500,
    maxAccuracy: 65, motionThreshold: 0.045, motionHoldMs: 300, speedAlpha: 0.65 });
  function config(input) {
    const p = Object.assign({}, DEFAULTS, input || {});
    for (const key of Object.keys(DEFAULTS)) {
      if (!Number.isFinite(p[key]) || p[key] < 0) throw new Error('无效参数：' + key);
    }
    if (p.exitSpeed >= p.enterSpeed || p.speedAlpha <= 0 || p.speedAlpha > 1 ||
        p.calibrationMs < 1000 || p.calibrationMs > 3000 || p.staleMs < 500 ||
        p.sensorStaleMs < 100 || p.maxAccuracy <= 0) throw new Error('参数范围或停行阈值顺序错误');
    return p;
  }
  const vector = v => v && ['x', 'y', 'z'].every(k => Number.isFinite(v[k]));
  const magnitude = v => Math.hypot(v.x, v.y, v.z);
  class Engine {
    constructor(params) {
      this.params = config(params); this.main = 'STOP'; this.status = 'waiting';
      this.baseline = null; this.lastTs = -1; this.candidate = null; this.calibration = null;
      this.clearSignals();
    }
    clearSignals() {
      this.confirmed = false;
      this.locationTs = -Infinity; this.accelTs = -Infinity; this.speed = null;
      this.motion = 0; this.motionSince = null; this.motionRecent = -Infinity; this.candidate = null;
    }
    push(e) {
      if (!e || !Number.isFinite(e.t) || e.t < this.lastTs) throw new Error('事件时间必须单调递增');
      this.lastTs = e.t;
      if (e.type === 'pause' || e.type === 'end') {
        this.status = 'paused'; this.calibration = null; this.clearSignals();
      } else if (e.type === 'resume') {
        this.clearSignals(); this.status = 'waiting';
      } else if (e.type === 'calibration-start') {
        this.clearSignals(); this.status = 'calibrating'; this.baseline = null;
        this.calibration = { start: e.t, accel: [], gyro: [] };
      } else if (e.type === 'accel' && vector(e.data) && this.status !== 'paused') {
        this.accelTs = e.t;
        if (this.calibration) this.calibration.accel.push(e.data);
        if (this.baseline) {
          // Acceleration is in g. Remove the averaged gravity vector; retain motion energy,
          // not an invented forward axis or an integrated speed estimate.
          const b = this.baseline.accel;
          const residual = magnitude({x:e.data.x-b.x,y:e.data.y-b.y,z:e.data.z-b.z});
          this.motion = this.motion * 0.75 + residual * 0.25;
          if (this.motion > this.params.motionThreshold) {
            if (this.motionSince === null) this.motionSince = e.t;
            if (e.t - this.motionSince >= this.params.motionHoldMs) this.motionRecent = e.t;
          } else this.motionSince = null;
        }
      } else if (e.type === 'gyro' && vector(e.data) && this.calibration) {
        this.calibration.gyro.push(e.data);
      } else if (e.type === 'location' && this.status !== 'paused') {
        const d = e.data || {};
        if (Number.isFinite(d.speed) && d.speed >= 0 && Number.isFinite(d.accuracy) &&
            d.accuracy >= 0 && d.accuracy <= this.params.maxAccuracy) {
          const fresh = e.t - this.locationTs <= this.params.staleMs;
          this.speed = fresh && this.speed !== null ?
            this.speed + this.params.speedAlpha * (d.speed - this.speed) : d.speed;
          this.locationTs = e.t;
        }
      } else if (e.type === 'sensor-error') {
        if (e.data && e.data.sensor === 'location') this.locationTs = -Infinity;
        if (e.data && e.data.sensor === 'accel') this.accelTs = -Infinity;
      }
      if (e.type === 'tick') this.tick(e.t);
      return this.snapshot(e.t);
    }
    tick(t) {
      if (this.status === 'paused') return;
      if (this.calibration) {
        if (t - this.calibration.start < this.params.calibrationMs) return;
        const c = this.calibration;
        this.calibration = null;
        if (!c.accel.length || t - this.accelTs > this.params.sensorStaleMs) {
          this.status = 'calibration-failed'; return;
        }
        const mean = rows => rows.length ? ['x','y','z'].reduce((out,k) => {
          out[k] = rows.reduce((n,v) => n + v[k], 0) / rows.length; return out;
        }, {}) : null;
        this.baseline = { accel: mean(c.accel), gyro: mean(c.gyro), samples: c.accel.length, t };
      }
      if (!this.baseline) return;
      const valid = t-this.locationTs <= this.params.staleMs && t-this.accelTs <= this.params.sensorStaleMs;
      if (!valid) { this.status = 'waiting'; this.confirmed = false; this.candidate = null; return; }
      this.status = this.confirmed ? 'ready' : 'waiting';
      // Fresh GPS is always required. Sustained motion only assists a near-threshold start.
      const moving = this.speed >= this.params.enterSpeed ||
        (this.speed > this.params.exitSpeed && t-this.motionRecent < 700);
      const target = this.main === 'STOP' ? (moving ? 'MOVE' : 'STOP') :
        (this.speed <= this.params.exitSpeed && this.motion <= this.params.motionThreshold ? 'STOP' : 'MOVE');
      if (target === this.main) { this.candidate = null; this.confirmed = true; this.status = 'ready'; return; }
      if (!this.candidate || this.candidate.main !== target) this.candidate = { main: target, since: t };
      const hold = target === 'MOVE' ? this.params.enterHoldMs : this.params.exitHoldMs;
      if (t-this.candidate.since >= hold) {
        this.main = target; this.candidate = null; this.confirmed = true; this.status = 'ready';
      }
    }
    snapshot(t) {
      return { main: this.main, status: this.status,
        speed: t-this.locationTs <= this.params.staleMs ? this.speed : null,
        motion: this.motion, baseline: this.baseline,
        countdown: this.calibration ? Math.max(0, Math.ceil((this.params.calibrationMs-t+this.calibration.start)/1000)) : 0 };
    }
  }
  return { Engine, DEFAULTS, VERSION, config };
});
