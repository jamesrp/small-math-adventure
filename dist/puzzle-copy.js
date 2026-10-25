// Full objective for Help and read-aloud, including goals already shown by the board.
export function puzzleObjective(puzzle) {
  const p = puzzle.parameters;
  switch (puzzle.mechanic) {
    case 'tile':
      return puzzle.tileShape === 'l-tromino' ? 'Cover every square with L-trominoes.' : 'Cover every square with dominoes.';
    case 'swap':
      return 'Match the cups to the letters.';
    case 'toggle':
      return p.press_budget == null
        ? 'Match the goal card.'
        : `Match the goal card in at most ${p.press_budget} presses.`;
    case 'clock':
      if (p.mode === 'choose_jump') {
        return `Return to the star for the first time on bell ${p.required_first_return}.`;
      }
      return p.clocks.length === 1
        ? 'Find the first bell that lands the marker on its star.'
        : 'Find the first bell that lands every marker on its star.';
    case 'billiard': {
      if (p.mode === 'cross') return 'Tap the first point on the ball’s line where two walls cross.';
      if (p.mode === 'every') return `Find every room up to ${p.cols} by ${p.rows} where the ball bounces exactly ${p.bounces === 1 ? 'once' : `${p.bounces} times`}.`;
      const verb = p.mode === 'aim' ? 'Aim' : 'Shape the room', n = p.target.bounces;
      if (p.target.corner === 'bottom-left') return `${verb} so the ball stops back at the corner it started from.`;
      return `${verb} so the ball stops at the ${p.target.corner.replace('-', ' ')} corner${n === undefined ? '' : ` after exactly ${n} ${n === 1 ? 'bounce' : 'bounces'}`}.`;
    }
    case 'route':
      if (p.mode === 'cover') return p.closed ? `Walk every road and come back to ${p.start}.` : 'Walk every road.';
      if (p.mode === 'each_edge_once') {
        return p.closed
          ? `Walk every road once, returning to ${p.start}.`
          : 'Walk every road exactly once.';
      }
      return p.edges.every(edge => edge[2] === 1)
        ? `Cover every road and return to ${p.start} in exactly ${p.target_cost} steps.`
        : `Cover every road and return to ${p.start} with total distance ${p.target_cost}.`;
    case 'color':
      return 'Color every lantern so linked pairs differ.';
    case 'latin':
      return `Use 1–${p.order} once in every row and column.`;
    case 'code':
      // The road's crypt door says it in its own words (dist/road.js).
      return puzzle.codeWords?.goal || 'Find a code that fits every recorded match count.';
    case 'nim':
      return 'Take the last pebble to win.';
    case 'jug':
      if (p.target_state) {
        const amounts = p.target_state.map((amount, index) =>
          `${amount === 0 ? 'none' : `${amount} ${amount === 1 ? 'unit' : 'units'}`} in ${String.fromCharCode(65 + index)}`);
        return `Leave ${amounts.slice(0, -1).join(', ')}, and ${amounts.at(-1)}.`;
      }
      return `Leave exactly ${p.target_amount} ${p.target_amount === 1 ? 'unit' : 'units'} in either jug.`;
    case 'weigh': {
      const limit = `at most ${p.weighing_budget} ${p.weighing_budget === 1 ? 'weighing' : 'weighings'}`;
      return p.odd_kind === 'heavy'
        ? `Find the heavy pebble in ${limit}.`
        : `Identify the odd pebble and whether it’s heavy or light, using ${limit}.`;
    }
    default:
      // Puzzles from family modules (dist/families.js) carry their own objective.
      if (typeof puzzle.objective === 'string' && puzzle.objective.trim()) return puzzle.objective;
      throw new Error(`Missing objective for puzzle mechanic: ${puzzle.mechanic}`);
  }
}

// Mirror Couriers rings the goal corner on the board, so the visible line
// carries only the bounce count, the start corner or the find-every bound.
function billiardObjective(p) {
  if (p.mode === 'cross') return 'Tap where the line first meets a crossing of two walls.';
  if (p.mode === 'every') return `Find every room where the ball bounces ${p.bounces === 1 ? 'once' : `${p.bounces} times`}.`;
  if (p.target.corner === 'bottom-left') return 'Stop back at the start.';
  const n = p.target.bounces;
  return n === undefined ? 'Stop at the ringed corner.' : `Stop at the ringed corner after ${n} ${n === 1 ? 'bounce' : 'bounces'}.`;
}

// Visible copy is only for information the board and its controls do not supply.
// A pack can set a puzzle's visible line itself; '' shows none.
export function visiblePuzzleObjective(puzzle) {
  if (typeof puzzle.visibleObjective === 'string') return puzzle.visibleObjective;
  if (puzzle.parameters?.mode === 'playground') return '';
  if (['tile', 'swap', 'toggle', 'code'].includes(puzzle.mechanic)) return '';
  if (puzzle.mechanic === 'billiard') return billiardObjective(puzzle.parameters);
  if (puzzle.mechanic === 'weigh') {
    return puzzle.parameters.odd_kind === 'heavy' ? 'Find the heavy pebble.' : 'Find the odd pebble: heavy or light?';
  }
  return puzzleObjective(puzzle);
}
