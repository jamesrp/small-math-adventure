// Place zero is at twelve o'clock; increasing places move clockwise.
export function clockJumpFromPlace(positions, start, place, min, max) {
  const jump = (place - start + positions) % positions;
  return jump >= min && jump <= max ? jump : null;
}

export function clockPlaceAtPoint(x, y, positions, center = 160) {
  const dx = x - center, dy = y - center, radius = Math.hypot(dx, dy);
  if (radius < 65 || radius > 136) return null;
  const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);
  return Math.round(angle * positions / (2 * Math.PI)) % positions;
}

export function clockStepJump(current, key, min, max) {
  const change = key === 'ArrowRight' || key === 'ArrowUp' ? 1 : key === 'ArrowLeft' || key === 'ArrowDown' ? -1 : 0;
  return Math.max(min, Math.min(max, current + change));
}

export function clockJumpArc(positions, start, jump, center = 160, radius = 77) {
  const point = angle => [center + radius * Math.sin(angle), center - radius * Math.cos(angle)];
  const startAngle = start * 2 * Math.PI / positions;
  const span = jump * 2 * Math.PI / positions;
  const endAngle = startAngle + span;
  const from = point(startAngle), to = point(endAngle);
  const tangent = [Math.cos(endAngle), Math.sin(endAngle)];
  const radial = [Math.sin(endAngle), -Math.cos(endAngle)];
  const base = [to[0] - 9 * tangent[0], to[1] - 9 * tangent[1]];
  const head = [to, [base[0] + 4 * radial[0], base[1] + 4 * radial[1]], [base[0] - 4 * radial[0], base[1] - 4 * radial[1]]];
  return {
    from: start,
    to: (start + jump) % positions,
    span,
    path: `M ${from[0]} ${from[1]} A ${radius} ${radius} 0 ${span > Math.PI ? 1 : 0} 1 ${to[0]} ${to[1]}`,
    head: head.map(point => point.join(',')).join(' ')
  };
}
