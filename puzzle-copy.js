// Full objective for Help and read-aloud, including goals already shown by the board.
export function puzzleObjective(puzzle) {
  const p = puzzle.parameters;
  switch (puzzle.mechanic) {
    case 'tile':
      return 'Cover every square with dominoes.';
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
        : 'Find the first bell that lands both markers on their stars.';
    case 'billiard':
      return p.mode === 'predict'
        ? 'Predict the first corner and the wall bounces before it.'
        : `Reach the ${p.target_corner.replace('-', ' ')} corner first, after exactly ${p.target_bounces} bounces.`;
    case 'route':
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
      return 'Find a code that fits every recorded match count.';
    case 'nim':
      return 'Choose a first move that wins against best play.';
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
      throw new Error(`Missing objective for puzzle mechanic: ${puzzle.mechanic}`);
  }
}

// Visible copy is only for information the board and its controls do not supply.
export function visiblePuzzleObjective(puzzle) {
  if (['swap', 'toggle', 'code'].includes(puzzle.mechanic)) return '';
  if (puzzle.mechanic === 'billiard' && puzzle.parameters.mode === 'predict') return '';
  if (puzzle.mechanic === 'weigh') {
    return puzzle.parameters.odd_kind === 'heavy' ? 'Find the heavy pebble.' : 'Find the odd pebble: heavy or light?';
  }
  return puzzleObjective(puzzle);
}
