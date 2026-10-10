// Presentation only. Saved clock boards continue to contain just { prediction }.
export const CLOCK_TRAIL_LIMIT = 48;
export const clockBellDelay = count => Math.min(400, 10000 / count);
export const clockRunCount = (p, prediction) => prediction == null ? 0 :
  p.parameters.mode === 'choose_jump' ? p.parameters.required_first_return : prediction;

export function createClockTimeline(onFrame, schedule = setTimeout, cancel = clearTimeout) {
  let key = null, draft = null, count = 0, total = 0, timer = null, epoch = 0;
  const stop = () => { epoch++; if (timer !== null) cancel(timer); timer = null; };
  const frame = () => onFrame();
  return {
    get key() { return key; },
    get presentation() { return { draft, count, total }; },
    leave() { stop(); key = null; draft = null; count = 0; total = 0; },
    enter(nextKey, p, prediction) {
      if (key === nextKey) return;
      stop(); key = nextKey; draft = null;
      total = clockRunCount(p, prediction); count = total;
    },
    edit(value, notify = true) {
      if (value === draft && count === 0) return;
      stop(); draft = value; count = 0; total = 0; if (notify) frame();
    },
    restore(p, prediction) {
      stop(); draft = null; total = clockRunCount(p, prediction); count = total; frame();
    },
    ring(p, prediction, reducedMotion = false) {
      stop(); draft = null; total = clockRunCount(p, prediction);
      count = total > CLOCK_TRAIL_LIMIT || reducedMotion ? total : 0;
      frame();
      if (count === total) return;
      const run = epoch, delay = clockBellDelay(total);
      const advance = () => {
        if (run !== epoch || key === null) return;
        count++; frame();
        if (count < total) timer = schedule(advance, delay);
        else timer = null;
      };
      timer = schedule(advance, delay);
    }
  };
}

export function clockTrailStep(positions, start, jump, bell, count) {
  const center = 160, turns = Math.ceil(Math.min(count, CLOCK_TRAIL_LIMIT) * jump / positions);
  const gap = Math.min(6, 33 / Math.max(1, turns - 1));
  const radius = lap => 72 - lap * gap;
  const point = (place, r) => [center + r * Math.sin(place * 2 * Math.PI / positions), center - r * Math.cos(place * 2 * Math.PI / positions)];
  const offset = start + (bell - 1) * jump, end = offset + jump;
  let at = offset, path = '';
  while (at < end) {
    const lap = Math.floor(at / positions), boundary = (lap + 1) * positions;
    const next = Math.min(end, boundary), r = radius(lap), a = point(at, r), b = point(next, r);
    if (!path) {
      path = `M ${a[0]} ${a[1]}`;
      if (bell > 1 && at % positions === 0) {
        const prior = point(at, radius(lap - 1));
        path = `M ${prior[0]} ${prior[1]} L ${a[0]} ${a[1]}`;
      }
    }
    const span = (next - at) * 2 * Math.PI / positions;
    path += ` A ${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${b[0]} ${b[1]}`;
    at = next;
    if (at < end) { const join = point(at, radius(lap + 1)); path += ` L ${join[0]} ${join[1]}`; }
  }
  // A landing on a lap boundary belongs to the lane just completed.
  const landingLap = Math.ceil(end / positions) - 1;
  const angle = end * 2 * Math.PI / positions, r = radius(landingLap), tip = point(end, r);
  const tangent = [Math.cos(angle), Math.sin(angle)], radial = [Math.sin(angle), -Math.cos(angle)];
  const base = [tip[0] - 6 * tangent[0], tip[1] - 6 * tangent[1]];
  return { path, head: [tip, [base[0] + 2.7 * radial[0], base[1] + 2.7 * radial[1]], [base[0] - 2.7 * radial[0], base[1] - 2.7 * radial[1]]].map(p => p.join(',')).join(' '), from: offset % positions, to: end % positions };
}
