// Constant-velocity Kalman filter on a local east/north plane. Smooths noisy GPS and
// can extrapolate a position to "now" when the last fix is up to a second old.
export class Track {
  constructor({ q = 1.5, r = 8 } = {}) {
    this.q = q;
    this.r = r;
    this.s = null;
  }
  // fix: { lat, lng, accuracyM, t (ms) }
  update(fix) {
    const k = 111195,
      cos = Math.cos((fix.lat * Math.PI) / 180);
    const z = { e: fix.lng * k * cos, n: fix.lat * k };
    const R = Math.max(fix.accuracyM ?? this.r, 2) ** 2;
    if (!this.s) {
      this.s = { e: z.e, n: z.n, ve: 0, vn: 0, pe: R, pn: R, pve: 100, pvn: 100, t: fix.t, cos };
      return this.get(fix.t);
    }
    const s = this.s,
      dt = Math.max((fix.t - s.t) / 1000, 0.05);
    for (const [p, v, pp, pv, zz] of [
      ['e', 've', 'pe', 'pve', z.e],
      ['n', 'vn', 'pn', 'pvn', z.n],
    ]) {
      s[p] += s[v] * dt; // predict
      s[pp] += dt * dt * s[pv] + this.q * dt;
      s[pv] += this.q * dt;
      const K = s[pp] / (s[pp] + R); // update
      const innov = zz - s[p];
      s[p] += K * innov;
      s[v] += ((K * innov) / dt) * 0.5;
      s[pp] *= 1 - K;
    }
    s.t = fix.t;
    s.cos = cos;
    return this.get(fix.t);
  }
  // position estimate at time t (extrapolated with the estimated velocity)
  get(t = this.s.t) {
    const s = this.s,
      dt = (t - s.t) / 1000,
      k = 111195;
    return { lat: (s.n + s.vn * dt) / k, lng: (s.e + s.ve * dt) / (k * s.cos), speedMs: Math.hypot(s.ve, s.vn) };
  }
}
