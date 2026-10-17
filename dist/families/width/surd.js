// Exact numbers for Snug spinners: a + b√r with rational a and b, kept as
// BigInt fractions, so that "these two corners are the same distance from
// this dot" is decided exactly, never within a tolerance.
//
// A puzzle's points are written in the pack as strings "a|b", meaning
// a + b√r, where a and b are fractions such as "-3/5" or "7". A point is
// [x, y]; its true position is (x·sx, y·sy), where sx and sy are positive
// reals with sx² = tx and sy² = ty in the same field. The regular pentagon
// uses this to keep its corners in Q(√5): x carries the factor cos 18°.
const ZERO = 0n, ONE = 1n;
const babs = n => n < ZERO ? -n : n;
function gcd(a, b) { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; }
// A fraction is [n, d] with d > 0 and gcd 1.
export function frac(n, d = ONE) {
  n = BigInt(n); d = BigInt(d);
  if (d === ZERO) throw new Error('zero denominator');
  if (d < ZERO) { n = -n; d = -d; }
  const g = gcd(n, d) || ONE;
  return [n / g, d / g];
}
const fadd = (x, y) => frac(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const fsub = (x, y) => frac(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const fmul = (x, y) => frac(x[0] * y[0], x[1] * y[1]);
const fsign = x => x[0] > ZERO ? 1 : x[0] < ZERO ? -1 : 0;
const feq = (x, y) => x[0] === y[0] && x[1] === y[1];
function fparse(s) {
  const text = String(s).trim();
  if (!/^-?\d+(\/\d+)?$/.test(text)) throw new Error(`not a fraction: ${s}`);
  const [n, d = '1'] = text.split('/');
  return frac(n, d);
}
const fstr = x => x[1] === ONE ? `${x[0]}` : `${x[0]}/${x[1]}`;

// The field Q(√r). Every operation returns a fresh [a, b].
export function field(r) {
  const R = BigInt(r);
  if (R < 2n) throw new Error('r must be a whole number above 1 with no square factor');
  for (let p = 2n; p * p <= R; p++) if (R % (p * p) === ZERO) throw new Error('r must have no square factor');
  const F = {
    r: R,
    of: (a, b = 0) => [typeof a === 'string' ? fparse(a) : frac(a), typeof b === 'string' ? fparse(b) : frac(b)],
    parse(s) { const [a, b = '0'] = String(s).split('|'); return [fparse(a), fparse(b)]; },
    str: x => `${fstr(x[0])}|${fstr(x[1])}`,
    add: (x, y) => [fadd(x[0], y[0]), fadd(x[1], y[1])],
    sub: (x, y) => [fsub(x[0], y[0]), fsub(x[1], y[1])],
    mul: (x, y) => [fadd(fmul(x[0], y[0]), fmul([R, ONE], fmul(x[1], y[1]))), fadd(fmul(x[0], y[1]), fmul(x[1], y[0]))],
    eq: (x, y) => feq(x[0], y[0]) && feq(x[1], y[1]),
    // 1 / (a + b√r) = (a − b√r) / (a² − r·b²); r is not a square, so the norm is not zero.
    inv(x) {
      const n = fsub(fmul(x[0], x[0]), fmul([R, ONE], fmul(x[1], x[1])));
      if (!fsign(n)) throw new Error('no inverse');
      const k = frac(n[1], n[0]);
      return [fmul(x[0], k), fmul(frac(-x[1][0], x[1][1]), k)];
    },
    // The sign of a + b√r, exactly: compare a² with r·b² when the signs differ.
    sign(x) {
      const sa = fsign(x[0]), sb = fsign(x[1]);
      if (!sb) return sa;
      if (!sa || sa === sb) return sb;
      const a2 = fmul(x[0], x[0]), rb2 = fmul([R, ONE], fmul(x[1], x[1]));
      const c = fsign(fsub(a2, rb2));
      return c > 0 ? sa : c < 0 ? sb : 0;
    },
    float: x => Number(x[0][0]) / Number(x[0][1]) + Number(x[1][0]) / Number(x[1][1]) * Math.sqrt(Number(R))
  };
  return F;
}

// A puzzle's geometry: the field, the metric factors and parsed points.
// spec = {r, tx, ty}; points are {id: [xString, yString]}.
export function geometry(spec, points) {
  const F = field(spec.r), tx = F.parse(spec.tx ?? '1'), ty = F.parse(spec.ty ?? '1');
  const at = Object.fromEntries(Object.entries(points).map(([id, [x, y]]) => [id, [F.parse(x), F.parse(y)]]));
  const sx = Math.sqrt(F.float(tx)), sy = Math.sqrt(F.float(ty));
  return {
    F, at,
    // The exact squared distance tx·dx² + ty·dy².
    d2(p, q) { const dx = F.sub(at[p][0], at[q][0]), dy = F.sub(at[p][1], at[q][1]); return F.add(F.mul(tx, F.mul(dx, dx)), F.mul(ty, F.mul(dy, dy))); },
    // The sign of the turn p → q → s (positive: counterclockwise). sx, sy > 0 drop out.
    turn(p, q, s) {
      const [a, b, c] = [at[p], at[q], at[s]];
      return F.sign(F.sub(F.mul(F.sub(b[0], a[0]), F.sub(c[1], a[1])), F.mul(F.sub(b[1], a[1]), F.sub(c[0], a[0]))));
    },
    // Floating-point positions, for drawing only.
    xy: id => [F.float(at[id][0]) * sx, F.float(at[id][1]) * sy]
  };
}
