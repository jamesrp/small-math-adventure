// Who talks on the Lantern Road. Keepers live at one stop and speak only when
// a puzzle opens or the player does something; Plume is the rival caravan.
// Lines stay short, in character, and never restate a puzzle's rules: the
// board and How to play carry those. The six travelers do not speak.

export const PARTY = ['pip', 'moss', 'rook', 'bea', 'fern', 'tumble'];
export const PARTY_NAMES = { pip: 'Pip', moss: 'Moss', rook: 'Rook', bea: 'Bea', fern: 'Fern', tumble: 'Tumble' };

// Reaction pools rotate so a repeated mistake does not repeat the same words.
// `hint` answers a Hint that shows a move; `nudge` (where the hint line names
// a place) answers the first, free Hint, which shows no place. `bye` is each
// keeper's goodbye at the finale, and Plume's `concede` ends the race there.
export const CAST = {
  snooze: {
    name: 'Snooze', kind: 'turtle', home: 'ferry', color: '#5fa57f',
    look: 'A giant, very sleepy sea turtle with a ferry deck and cargo cradles on her shell.',
    oops: ['Mm? Not that.', 'Hmm… no.', 'Too wiggly.'],
    hint: 'Psst. Try here.',
    nudge: 'Mm… a thought for you.',
    bye: 'Mm… come ride with me again. Any time.',
  },
  hops: {
    name: 'Mr. Hops', kind: 'frog', home: 'marsh', color: '#4f9d6a',
    look: 'A fussy frog lamplighter in a tall hat, carrying a long lighting pole.',
    oops: ['Ahem. No.', 'Tsk. Not that.', 'Oh dear, no.'],
    hint: 'If I may…',
    bye: 'Do come back. Punctually, please.',
  },
  billie: {
    name: 'Billie', kind: 'goat', home: 'ridge', color: '#d98a3a',
    look: 'A loud, cheerful mountain goat who runs the cable car, scarf flapping in the wind.',
    oops: ['Nope!', 'Ha! Try again!', 'Not that one!'],
    hint: 'Tip coming! Catch!',
    bye: 'Bye! Come back and ride my cable car!',
  },
  rattle: {
    name: 'Rattle', kind: 'skeleton', home: 'hollow', color: '#9a6fd1',
    look: 'A theatrical skeleton gardener with a pumpkin-orange scarf and a little watering can.',
    oops: ['Boo! Wrong!', 'Ooooh, no.', 'Rattle rattle. Nope.'],
    hint: 'A spooky secret…',
    bye: 'Leaving so soon? Visit again… if you dare. Heh heh.',
  },
  sprocket: {
    name: 'Sprocket', kind: 'raccoon', home: 'workshop', color: '#c4703f',
    look: 'A fast-talking raccoon inventor in goggles with a tool belt full of springs.',
    oops: ['Clank! Not that.', 'Whoops!', 'Nope, nope.'],
    hint: 'Ooh! Idea!',
    bye: 'Bye! I’m building you something for next time!',
  },
  wick: {
    name: 'Wick', kind: 'owl', home: 'lighthouse', color: '#4f7fb8',
    look: 'A calm owl lighthouse keeper in a yellow raincoat.',
    oops: ['Hoo. No.', 'Not quite.', 'Hm.'],
    hint: 'Consider this.',
    bye: 'Safe travels. I’ll keep the light on.',
  },
  plume: {
    name: 'Plume', kind: 'peacock', home: null, color: '#2f8fa8',
    look: 'A show-off peacock who leads the rival caravan, a wagon with a tail-feather awning.',
    oops: ['Ha! Not like that!', 'Tsk tsk.', 'That’s not how I’d do it.'],
    hint: 'Need help? Ha!',
    // Score-card reactions after a solve, by comparison with Plume's score.
    beat: ['What?! How?', 'No fair! …Fine.', 'Hmph. Lucky.'],
    tie: ['A tie?! Hmph.', 'Same as me. For now.'],
    lose: ['Ha! Still the best!', 'Too slow! Ha!'],
    gloat: ['Ha! I win! Again?', 'Ha! Undo all you like.'],
    concede: 'Fine. You won the race. Next year I’m faster!',
  },
};

// The keepers in the order the road meets them, for the finale's goodbyes.
export const KEEPERS = ['snooze', 'hops', 'billie', 'rattle', 'sprocket', 'wick'];
export const speakerOf = id => CAST[id] || null;
export const pick = (list, seed = 0) => Array.isArray(list) ? list[Math.abs(seed) % list.length] : list;
