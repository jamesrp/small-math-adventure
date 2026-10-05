// Builds dist/families/beads/beads.json, the Bead rings pack, from the
// authoring list below. Answers, witnesses and fewest counts are computed here
// with dist/families/beads/beads.js and checked again, by other methods, in
// scripts/validate-beads.mjs.
// Design notes and worksheet sources: docs/beads/README.md.
import {writeFile} from 'node:fs/promises';
import {answers, fits, fewestOf, measure} from '../dist/families/beads/beads.js';
import {allWords, lopsided, ringClasses} from '../dist/bead-ring.js';

const WEEKS = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2';
export const sources = [
  {id: 'beads-week33', title: 'Bellingham Math Circle — Week 33: Prime-length necklaces, packets, adult guide and encore', url: `${WEEKS}/week-33`, kind: 'local curriculum'},
  {id: 'beads-week34', title: 'Bellingham Math Circle — Week 34: Hidden turns, packets, adult guide and encore', url: `${WEEKS}/week-34`, kind: 'local curriculum'},
  {id: 'beads-golomb', title: 'Solomon W. Golomb — Combinatorial proof of Fermat’s “little” theorem, American Mathematical Monthly 63 (1956), 718', url: 'https://doi.org/10.2307/2309563', kind: 'research'},
  {id: 'beads-oeis', title: 'OEIS A000031 — Number of n-bead necklaces with 2 colors when turning over is not allowed', url: 'https://oeis.org/A000031', kind: 'reference'},
  {id: 'beads-debruijn', title: 'N. G. de Bruijn — A combinatorial problem, Proceedings of the Koninklijke Nederlandse Akademie van Wetenschappen 49 (1946), 758–764', url: 'https://research.tue.nl/en/publications/a-combinatorial-problem', kind: 'research'},
  {id: 'beads-albertson', title: 'Michael O. Albertson and Karen L. Collins — Symmetry breaking in graphs, Electronic Journal of Combinatorics 3 (1996), R18', url: 'https://doi.org/10.37236/1242', kind: 'research'}
];
export const family = {
  id: 'beads',
  title: 'Bead rings',
  mathematics: 'A ring of n beads stays face up, so two rings are the same when a turn carries one onto the other. The fewest turns that bring a ring back to itself is also the number of different readouts it shows from its n starting beads, and it divides n. At a prime length p, every ring with two colours or more shows p readouts, so the c^p − c mixed readouts fall into families of p and p divides c^p − c: Fermat’s little theorem, counted with beads (Golomb). A ring is lopsided when no turn or flip besides staying still matches it, a distinguishing colouring of the cycle (Albertson and Collins): rings of three, four and five beads need three colours, and from six beads two colours are enough, with at least three beads of the less common colour.',
  rules: [
    'A ring stays face up. A turned ring is the same ring.',
    'Tap a bead to change its colour.'
  ],
  sourceIds: sources.map(s => s.id)
};

const GROUP = 'Hidden turns';
const CONTROLS = {
  every: 'Tap a bead to change its colour. When every bead is painted and the ring fits, it is kept below. A ring you already have lights up its card, and the card turns to show the match. Clear empties the ring. When you are sure you have them all, press That’s all. Undo never loses a kept ring.',
  windows: 'Tap a bead to change its colour. The cards show every window of beads read clockwise from one bead, including windows that cross from the last bead to the first. A card turns green when your ring shows it once and ochre when it shows it more than once.',
  turns: 'Tap a bead to change its colour. Turn moves the see-through copy one bead clockwise; its number counts the turns. Where a copy dot lands on a bead of its own colour, the bead’s edge turns green, and when every bead matches, the ring glows. Press No ring can if you are sure no ring works.',
  hidden: 'Tap a bead to change its colour. Turn moves the see-through copy one bead clockwise and Flip turns it over. Where a copy dot lands on a bead of its own colour, the bead’s edge turns green, and when every bead matches, the ring glows: that turn or flip matches.',
  fewest: kind => `Tap a bead to change its colour. Turn moves the see-through copy one bead clockwise and Flip turns it over; when every bead matches, the ring glows. A ring that no turn or flip matches is marked ✓ with its number of ${kind}. When a turn or flip matches your ring, you can press None with that many ${kind} if you are sure no ring with that many, or fewer, works.`
};
const HIDDEN_RULES = ['A ring stays face up, but its copy can be turned and flipped.', 'A turn or flip matches when every bead’s copy lands on a bead of its own colour. Staying still, or a whole turn, does not count.'];

const authored = [
  // ---- Necklaces (Week 33)
  {
    number: 1, difficulty_level: 'easy', title: 'Three beads',
    parameters: {mode: 'every', n: 3, colours: 2},
    objective: 'Find every ring of three beads.',
    idea: 'Turning a ring does not make a new one, so the eight ways to paint three beads make only four rings.',
    prerequisites: 'Tell green from gold. Nothing to read.',
    hints: ['Start with every bead green.', 'Change one bead at a time. If a ring is one you have, turned, its card lights up.', 'Sort them by how many gold beads they have.'],
    parent: {
      notice: 'Whether your child expects green, green, gold and gold, green, green to be two rings, and what they make of the card that lights up and turns.',
      prompt: 'How do you know there isn’t another one?',
      explanation: 'Up to turning there are four rings: no gold, one gold, two gold, all gold. A ring with both colours shows three different readouts as its start moves round, because 3 is prime, so the 8 ways to paint three beads in a row split 1 + 3 + 3 + 1.',
      extension: 'How many different readouts does each ring have? Do they add up to 8?',
      connection: 'Necklaces up to rotation. At a prime length p the mixed necklaces come in families of p readouts: Golomb’s counting proof of Fermat’s little theorem.'
    },
    provenance: 'Week 33 Problem 1 in every band (three-bead rings) and Problem 2 (the eight-card sort).'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Two and two',
    parameters: {mode: 'every', n: 4, colours: 2, counts: {A: 2, B: 2}},
    objective: 'Find every ring with two green and two gold beads.', visibleObjective: 'Find every ring with these beads.',
    idea: 'Two gold beads on a ring of four are either neighbours or opposite, so there are two rings.',
    prerequisites: 'Count to two. The badges show the colours to use.',
    hints: ['Put the two gold beads next to each other.', 'Where else could the second gold bead go?', 'Two gold beads are either side by side or across from each other.'],
    parent: {
      notice: 'Whether your child tries the gold beads in every pair of places, or reasons about side by side and opposite.',
      prompt: 'Why can’t there be a third ring?',
      explanation: 'Any two of the four places are neighbours or opposite, and a turn carries any neighbouring pair to any other. So there are exactly two rings: green, green, gold, gold and green, gold, green, gold. The first shows four readouts as it turns, the second only two.',
      extension: 'Three gold and three green on six beads: how many rings? (Four.)',
      connection: 'Counting necklaces with a fixed number of beads of each colour, here by a direct case split; Burnside’s lemma counts them in general.'
    },
    provenance: 'Week 33 K–1 Problem 3 (two A and two B).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Back in two',
    parameters: {mode: 'make', n: 4, colours: 2, period: 2},
    objective: 'Make a ring that looks the same after 2 turns, but not after 1.',
    idea: 'Two turns match when opposite beads agree; one turn matches only a ring of one colour.',
    prerequisites: 'Count turns to two. A grown-up can read the goal.',
    hints: ['Paint the ring, then press Turn twice and watch where the copy lands.', 'After two turns each bead’s copy sits on the bead across from it.', 'Try green, gold, green, gold.'],
    parent: {
      notice: 'Whether your child uses the copy to check, or paints and waits for the ring to be accepted.',
      prompt: 'What happens to green, gold, green, gold after one turn? After two?',
      explanation: 'Two turns carry each bead to the opposite bead, so the ring must alternate. One turn would match only if all four beads were the same colour. The ring alternates: green, gold, green, gold, with two readouts.',
      extension: 'Can you make a ring of four that looks the same after 3 turns but not sooner? (Puzzle 5.)',
      connection: 'The fewest turns that bring a ring back is its period; it divides the number of beads.'
    },
    provenance: 'Week 33 K–1 Problem 4 and grades 2–3 Problem 3 (one, two or four readouts on four beads).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Two gold on five',
    parameters: {mode: 'every', n: 5, colours: 2, counts: {A: 3, B: 2}},
    objective: 'Find every ring with three green and two gold beads.', visibleObjective: 'Find every ring with these beads.',
    idea: 'On five beads two gold beads are neighbours or one apart: two rings, each with five readouts.',
    prerequisites: 'Count to three. The badges show the colours to use.',
    hints: ['Put the two gold beads next to each other.', 'Now leave one green bead between them.', 'What if two green beads are between them? Turn that ring and look.'],
    parent: {
      notice: 'Whether your child sees that two green beads between the gold ones, one way round, is one green bead the other way round.',
      prompt: 'Is gold, green, green, gold, green new?',
      explanation: 'Going round the ring, the gaps between the two gold beads add up to three green beads: 0 and 3, or 1 and 2. So there are two rings, gold, gold, green, green, green and gold, green, gold, green, green. Each shows five different readouts.',
      extension: 'Turn each ring all the way round. How many turns before it looks the same?',
      connection: 'At prime length every mixed necklace has all p rotations different.'
    },
    provenance: 'Week 33 K–1 Problem 5 (two A and three B on five beads).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Back in three?',
    parameters: {mode: 'make', n: 4, colours: 2, period: 3},
    objective: 'Make a ring that looks the same after 3 turns, but not sooner. Or press No ring can.',
    visibleObjective: 'Make a ring that looks the same after 3 turns, but not sooner.',
    idea: 'The fewest turns that bring a ring back divides its number of beads: 1, 2 or 4 here, never 3.',
    prerequisites: 'Count turns to four. A grown-up can read the goal.',
    hints: ['Turn some rings all the way round. When does each first look the same?', 'Three turns of four beads put each copy one bead behind where it started.', 'If every bead matches the bead behind it, what colour is the whole ring?'],
    parent: {
      notice: 'Whether your child collects evidence (1, 2, 4, 4, …) before pressing No ring can.',
      prompt: 'Which numbers of turns have you seen bring a ring of four back?',
      explanation: 'No ring works. Three turns of four beads move every bead one place back, so a match makes every bead the colour of its neighbour: the ring is one colour and already matched after one turn. In general the first matching turn d divides n, because a match after d and after n gives a match after their difference.',
      extension: 'On six beads, which first-match numbers can happen? (1, 2, 3 and 6.)',
      connection: 'The stabiliser of a necklace under rotation is a subgroup of the cyclic group, so its orbit size divides n.'
    },
    provenance: 'Week 33 grades 2–3 Problem 3 and grades 4–5 Problem 3 (three readouts is impossible on four beads).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Back in three',
    parameters: {mode: 'make', n: 6, colours: 2, period: 3},
    objective: 'Make a ring of six that looks the same after 3 turns, but not sooner.',
    idea: 'A ring of six that comes back after three turns repeats a block of three beads twice.',
    prerequisites: 'Count turns to three. A grown-up can read the goal.',
    hints: ['Three turns of six beads move each copy to the bead across the ring.', 'So beads across from each other must match. What else must be true?', 'Paint three beads, then paint the same three across the ring.'],
    parent: {
      notice: 'Whether your child builds the ring in two halves, or adjusts beads until the copy matches.',
      prompt: 'Why does green, gold, green, gold, green, gold come back too soon?',
      explanation: 'Three turns carry each bead to the opposite bead, so the ring is a block of three beads repeated twice. The block must not be one colour, or the ring would come back after one turn. Green, green, gold, green, green, gold and green, gold, gold, green, gold, gold both work. Alternating green and gold comes back after two turns.',
      extension: 'Make a ring of six that comes back only after all six turns.',
      connection: 'A ring with period d is n/d copies of a block of length d.'
    },
    provenance: 'Week 33 K–1 Problem 6 (six-bead rings with two, three and six readouts).'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Five beads',
    parameters: {mode: 'every', n: 5, colours: 2},
    objective: 'Find every ring of five beads.',
    idea: 'There are eight rings: the 32 ways to paint five beads in a row are two of one colour and six families of five.',
    prerequisites: 'Count to five. Sorting by the number of gold beads helps.',
    hints: ['Sort the rings by how many gold beads they have.', 'Two gold beads are side by side or one apart.', 'With three gold beads, look at the two green ones instead.'],
    parent: {
      notice: 'Whether your child organises the search by the number of gold beads, and how they decide that a count is finished.',
      prompt: 'How do you know you have every ring with two gold beads?',
      explanation: 'Eight rings: all green, one gold, two gold side by side, two gold apart, the same two with the colours swapped, four gold and all gold. Each mixed ring shows five readouts, so the 32 painted rows split as 2 + 6 × 5. That is why 5 divides 2^5 − 2 = 30.',
      extension: 'With three colours there are 3 + (243 − 3)/5 = 51 rings of five beads. Why must 243 − 3 divide by 5?',
      connection: 'Golomb’s necklace proof of Fermat’s little theorem: p divides c^p − c.'
    },
    provenance: 'Week 33 grades 2–3 Problem 4 and grades 4–5 Problem 4 (the 32 cards make eight rings).'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Sooner on five',
    parameters: {mode: 'make', n: 5, colours: 2, sooner: true, mixed: true},
    objective: 'Make a ring of five with both colours that looks the same in fewer than 5 turns. Or press No ring can.',
    visibleObjective: 'Use both colours and make a ring of five that looks the same in fewer than 5 turns.',
    idea: 'Five is prime, so turning by any smaller step visits every bead: a ring with both colours needs all five turns.',
    prerequisites: 'Count turns to five. A grown-up can read the goal.',
    hints: ['Try a ring with two gold beads and turn its copy until it matches.', 'If two turns brought it back, so would four, six, eight and ten. Which beads does one bead visit?', 'Turning by 1, 2, 3 or 4 on five beads visits every bead before it comes home.'],
    parent: {
      notice: 'Whether your child compares with puzzle 6, where six beads did come back early.',
      prompt: 'Six beads could come back after three turns. Why not five?',
      explanation: 'No ring works. If k turns (0 < k < 5) bring a ring back, so do 2k, 3k and 4k, and on five beads those steps visit every position. Every bead then has the same colour as bead one, so the ring has one colour. At a prime length every mixed ring shows all p readouts.',
      extension: 'Which lengths let a ring with both colours come back early? (Exactly the lengths that are not prime.)',
      connection: 'In a cyclic group of prime order every element other than the identity generates the group.'
    },
    provenance: 'Week 33 grades 2–3 Problem 5 and grades 4–5 Problem 5 (prime-length rings have p readouts).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Three colours',
    parameters: {mode: 'every', n: 3, colours: 3},
    objective: 'Find every ring of three beads in three colours.',
    idea: 'Eleven rings: three of one colour, and 24 mixed readouts in families of three.',
    prerequisites: 'Organise a search. Green, gold and blue: tapping a bead goes round the three colours.',
    hints: ['Start with the rings of one colour.', 'Then two beads of one colour and one of another.', 'Green, gold, blue and green, blue, gold are different rings: no turn makes one into the other.'],
    parent: {
      notice: 'Whether your child expects green, gold, blue and green, blue, gold to be the same ring. They are mirror images, and the rings stay face up.',
      prompt: 'Can you turn green, blue, gold into green, gold, blue?',
      explanation: 'Three of one colour; six with two of one colour and one of another (three choices for the pair times two for the single); and two with all three colours, green, gold, blue and green, blue, gold. That is 11 = 3 + (27 − 3)/3.',
      extension: 'If flipping were allowed, how many would there be? (Ten: the two three-colour rings become one.)',
      connection: 'Necklaces versus bracelets: allowing flips is the dihedral group instead of the cyclic one.'
    },
    provenance: 'Week 33 grades 4–5 Problem 6 (three colours, 51 rings on five beads), here on three beads.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'No neighbours alike',
    parameters: {mode: 'every', n: 5, colours: 3, apart: true},
    objective: 'Find every ring of five beads in three colours where no two neighbours match.',
    idea: 'Two colours cannot alternate round five beads; with three there are 30 painted rows, so 30/5 = 6 rings.',
    prerequisites: 'Organise a search. A dashed red string shows two neighbours that match.',
    hints: ['Green and gold alone can’t go all the way round five beads. Where does blue go?', 'Try one blue bead first.', 'With one blue bead, the other four alternate. Which colour comes after the blue?'],
    parent: {
      notice: 'Whether your child discovers that two colours never close up on five beads, and uses the single colour to organise the search.',
      prompt: 'Why can’t green and gold alone go round five beads?',
      explanation: 'An alternating ring needs an even number of beads, so one colour appears once. Choose it (three ways); the other four beads alternate, starting with either colour (two ways). That gives six rings. Every ring here uses at least two colours and 5 is prime, so each shows five readouts: the 30 good rows give 30/5 = 6.',
      extension: 'How many on six beads? (Rows: 2^6 + 2 = 66, but now some rings come back early.)',
      connection: 'Proper colourings of a cycle: (c − 1)^n + (−1)^n (c − 1) rows, counted with the chromatic polynomial.'
    },
    provenance: 'Week 33 encore Problems 2 and 3 (alternating rings and five-bead rings in three kinds).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Every pair once',
    parameters: {mode: 'make', n: 4, colours: 2, windows: 2},
    objective: 'Make a ring that shows each card exactly once, reading clockwise.',
    idea: 'Four beads have four windows of two, so each pair of colours must appear exactly once.',
    prerequisites: 'Read pairs of colours clockwise, including across the closing gap.',
    hints: ['Each card is two neighbours read clockwise, including the last bead and the first.', 'Green-green needs two greens side by side, and gold-gold two golds.', 'Green, green, gold, gold.'],
    parent: {
      notice: 'Whether your child reads the window that crosses from the last bead back to the first.',
      prompt: 'Why can’t a shorter ring show all four cards?',
      explanation: 'A ring of n beads shows n windows, so it needs at least four beads for four cards, and then each card appears exactly once. Green-green and gold-gold force a block of two of each: green, green, gold, gold. It is the de Bruijn ring for pairs.',
      extension: 'Puzzle 12 asks for windows of three on eight beads.',
      connection: 'De Bruijn sequences: a shortest cyclic word containing every word of length k exactly once.'
    },
    provenance: 'Week 33 encore Problems 4 and 5 (the shortest ring with every two-letter card).'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Every three once',
    parameters: {mode: 'every', n: 8, colours: 2, windows: 3},
    objective: 'Find every ring of eight beads that shows each card exactly once, reading clockwise.',
    visibleObjective: 'Find every ring that shows each card exactly once.',
    idea: 'There are two rings, each the other read backwards: the de Bruijn rings for windows of three.',
    prerequisites: 'Read windows of three clockwise. Patience with eight beads.',
    hints: ['Three greens in a row and three golds in a row must both appear.', 'Right after green, green, green comes gold, and right before it comes gold.', 'Read your ring the other way round. Is that one you have?'],
    parent: {
      notice: 'Whether your child builds from the long runs, and whether they notice the second ring is the first one backwards.',
      prompt: 'Is green, green, green, gold, green, gold, gold, gold the same as green, green, green, gold, gold, gold, green, gold?',
      explanation: 'Two rings: green³ gold green gold³ and green³ gold³ green gold. Each card shows once, so each ring walks through all eight windows of three. Reading one backwards gives the other, so they are one ring if flips are allowed. There are 2^(2^(k−1) − k) de Bruijn rings for windows of k.',
      extension: 'A mirror of a ring here shows each card backwards, so why does it still show every card once?',
      connection: 'De Bruijn sequences B(2, 3), and Eulerian circuits in the de Bruijn graph.'
    },
    provenance: 'Week 33 encore Problems 6 and 7 (every shortest ring for the eight three-letter cards).'
  },

  // ---- Hidden turns (Week 34)
  {
    number: 1, group: GROUP, difficulty_level: 'easy', title: 'Four beads',
    parameters: {mode: 'make', n: 4, colours: 3, fewest: 'colours'},
    objective: 'Paint four beads so no turn or flip matches, with as few colours as you can.',
    idea: 'Two colours always leave a flip; three colours work when the two single colours sit side by side.',
    prerequisites: 'Tell three colours apart. A grown-up can read the goal.',
    hints: ['Paint two green and two gold. Turn and flip the copy: does anything match?', 'With two colours one colour has at most two beads, and a flip can keep them both in place.', 'Use blue too: green, gold, blue, blue.'],
    parent: {
      notice: 'Whether your child tests every turn and flip, or only turns. Flips are where two-colour rings hide.',
      prompt: 'Which motion matched your two-colour ring?',
      explanation: 'Three colours: green, gold, blue, blue works, because a matching motion must keep the single green and the single gold in place, and only staying still keeps two neighbours in place. Two colours never work: the less common colour has at most two beads, and the mirror line through one bead, or halfway between two, keeps them in place.',
      extension: 'How many beads must a ring have before two colours can work? (Six: puzzle 2.)',
      connection: 'The distinguishing number of the cycle C4 is 3 (Albertson and Collins).'
    },
    provenance: 'Week 34 K–1 Problem 2, grades 2–3 Problem 2 and grades 4–5 Problem 2 (the four-ring needs three kinds).'
  },
  {
    number: 2, group: GROUP, difficulty_level: 'medium', title: 'Six beads, two colours',
    parameters: {mode: 'make', n: 6, colours: 2},
    objective: 'Paint six beads in two colours so no turn or flip matches. Or press No ring can.',
    visibleObjective: 'Paint the ring so no turn or flip matches.',
    idea: 'Two colours work on six beads: three gold beads with gaps 1, 2 and 3 break every symmetry.',
    prerequisites: 'Test turns and flips with the copy. A grown-up can read the goal.',
    hints: ['Try three gold beads.', 'Put two gold beads side by side and the third with one green between.', 'Gold, gold, green, gold, green, green.'],
    parent: {
      notice: 'Whether your child expects six beads to need three colours like four did, and presses No ring can.',
      prompt: 'Your ring with three gold beads: how far apart are they, going round?',
      explanation: 'Gold, gold, green, gold, green, green works. Going round, the gaps between gold beads are 1, 2 and 3 steps. A turn would move the gaps round and a flip would reverse their order, and either would need two gaps to be equal. It is the only such ring up to turns and flips.',
      extension: 'Does the same idea work on seven beads? Eight? (Gaps 1, 2 and n − 3.)',
      connection: 'The distinguishing number of the cycle C_n is 2 for n ≥ 6.'
    },
    provenance: 'Week 34 K–1 Problem 5, grades 2–3 Problem 4 and grades 4–5 Problem 4 (the six-ring with two kinds).'
  },
  {
    number: 3, group: GROUP, difficulty_level: 'medium', title: 'Five beads',
    parameters: {mode: 'make', n: 5, colours: 3, fewest: 'colours'},
    objective: 'Paint five beads so no turn or flip matches, with as few colours as you can.',
    idea: 'Five beads, like four, need three colours: the less common of two colours has at most two beads.',
    prerequisites: 'Test turns and flips with the copy. A grown-up can read the goal.',
    hints: ['Six beads worked with two colours. Try two colours here and test every flip.', 'The less common colour has one or two beads. Find the mirror line that keeps them in place.', 'Green, gold, blue, blue, blue.'],
    parent: {
      notice: 'Whether your child carries over the six-bead pattern and finds which flip matches it.',
      prompt: 'Where is the mirror line for your two-colour ring?',
      explanation: 'Three colours: green, gold, blue, blue, blue works, as on four beads. Two colours never work: on five beads the less common colour has at most two beads, and the mirror line through the middle of them keeps them in place.',
      extension: 'Why does six beads escape this argument? (The less common colour can have three beads.)',
      connection: 'The distinguishing number of C3, C4 and C5 is 3.'
    },
    provenance: 'Week 34 K–1 Problem 4, grades 2–3 Problem 3 and grades 4–5 Problem 3 (the five-ring).'
  },
  {
    number: 4, group: GROUP, difficulty_level: 'medium', title: 'Fewest gold',
    parameters: {mode: 'make', n: 8, colours: 2, fewest: 'B'},
    objective: 'Paint eight beads so no turn or flip matches, with as few gold beads as you can.',
    idea: 'Two gold beads always have a mirror line; three gold beads with gaps 1, 2 and 5 have none.',
    prerequisites: 'Count gold beads. Test turns and flips with the copy.',
    hints: ['Try the six-bead pattern, stretched: three gold beads.', 'Put two gold beads side by side and the third two steps on.', 'With two gold beads, find the mirror line halfway between them.'],
    parent: {
      notice: 'Whether your child looks for the mirror line between two gold beads before pressing None with 2 gold.',
      prompt: 'With two gold beads, which flip matches?',
      explanation: 'Three gold beads: gold, gold, green, gold, green, green, green, green works, with gaps 1, 2 and 5. Two gold beads never work: the perpendicular bisector of the two of them is a mirror line of the ring, and it keeps both in place. One or none have a mirror line too.',
      extension: 'Is three the fewest for every ring of six beads or more? (Yes: the same mirror argument.)',
      connection: 'In a distinguishing two-colouring of C_n each colour class has at least three vertices.'
    },
    provenance: 'Week 34 grades 2–3 Problem 5 (the fewest beads of the less frequent kind on eight).'
  },
  {
    number: 5, group: GROUP, difficulty_level: 'hard', title: 'Every lopsided eight',
    parameters: {mode: 'every', n: 8, colours: 2, counts: {A: 5, B: 3}},
    objective: 'Find every ring of eight with three gold beads that no turn or flip matches. A turned or flipped ring is the same ring.',
    visibleObjective: 'Find every ring that no turn or flip matches.',
    idea: 'The gaps between three gold beads add to 8; they must be three different numbers: 1, 2, 5 or 1, 3, 4.',
    prerequisites: 'Organise a search by the gaps between gold beads.',
    hints: ['Count the green beads between gold beads going round. The three gaps add up to 8.', 'If two gaps are equal, a flip matches.', 'Gaps 1, 2, 5 and gaps 1, 3, 4.'],
    parent: {
      notice: 'Whether your child records gaps, and whether a flipped copy of a ring they have is recognised.',
      prompt: 'Which gaps have you tried? Do any two have to be equal?',
      explanation: 'Going round, the three gaps between gold beads add to 8. A turn or flip that matches would permute the gaps, and it can only do that if two are equal. Splits of 8 into three different numbers: 1 + 2 + 5 and 1 + 3 + 4. So there are two rings, up to turns and flips. Counting mirror images separately there would be four.',
      extension: 'How many on seven beads? (One: gaps 1, 2, 4.)',
      connection: 'A dihedral motion preserving three marked points permutes their cyclic gaps.'
    },
    provenance: 'Week 34 K–1 Problem 6 (two genuinely different eight-rings) and grades 4–5 Problem 5.'
  },
  {
    number: 6, group: GROUP, difficulty_level: 'hard', title: 'Two flips',
    parameters: {mode: 'make', n: 6, colours: 2, flips: 2},
    objective: 'Make a ring of six that exactly two flips match. Or press No ring can.',
    visibleObjective: 'Make a ring of six that exactly two flips match.',
    idea: 'Two matching flips bring a half turn with them: a ring that repeats a block of three.',
    prerequisites: 'Test all six flips with the copy: Flip, then Turn.',
    hints: ['Flip the copy, then turn it: you visit all six mirror lines.', 'If two flips match, doing one and then the other is a turn that matches too.', 'Gold, gold, green, gold, gold, green.'],
    parent: {
      notice: 'Whether your child checks all six flips systematically.',
      prompt: 'Which turn matches your ring too?',
      explanation: 'Gold, gold, green, gold, gold, green works: two mirror lines, at right angles, and a half turn. Doing one matching flip after another gives a turn, so the matching motions come in a group: with exactly two flips the matching turns are just the half turn.',
      extension: 'Which numbers of matching flips can a ring of six have? (0, 1, 2, 3 or 6.)',
      connection: 'Subgroups of the dihedral group D6; the matching flips of a ring with turns of order m number m or 0.'
    },
    provenance: 'Week 34 encore Problem 1 (six-rings with exactly one, two and three matching flips).'
  },
  {
    number: 7, group: GROUP, difficulty_level: 'hard', title: 'Four flips?',
    parameters: {mode: 'make', n: 6, colours: 2, flips: 4},
    objective: 'Make a ring of six that exactly four flips match. Or press No ring can.',
    visibleObjective: 'Make a ring of six that exactly four flips match.',
    idea: 'Matching flips come with matching turns: the count is 0, or equals the number of matching turns, 1, 2, 3 or 6.',
    prerequisites: 'Puzzle 6 first.',
    hints: ['Make rings with one, two, three and six matching flips.', 'Two matching flips give a matching turn. How many turns would four flips give?', 'If four flips matched, so would the turns between them, and then all the flips would match.'],
    parent: {
      notice: 'Whether your child uses puzzle 6’s discovery: two matching flips make a matching turn.',
      prompt: 'If two flips match, which turn matches?',
      explanation: 'No ring works. The matching turns of a ring form a group of 1, 2, 3 or 6 turns (counting staying still), and if any flip matches, the matching flips are exactly that flip followed by each matching turn. So the number of matching flips is 0, 1, 2, 3 or 6, never 4 or 5.',
      extension: 'On eight beads, which numbers of matching flips happen? (0, 1, 2, 4 and 8.)',
      connection: 'In a dihedral group, the reflections in a subgroup form a coset of its rotation subgroup.'
    },
    provenance: 'Week 34 encore Problem 2 (can a six-ring have exactly four matching flips?).'
  }
];

const playground = {
  id: 'beads-playground', number: 0, title: 'Bead rings playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Paint a ring, then turn and flip its copy.',
  controls: 'Choose how many beads and how many colours. Tap a bead to change its colour. Turn moves the see-through copy one bead clockwise, with a count of the turns, and Flip turns it over. Where a copy dot lands on a bead of its own colour, the bead’s edge turns green; when every bead matches, the ring glows. Clear empties the ring.',
  rules: ['A ring stays face up; its copy can be turned and flipped.', 'A turn or flip matches when every bead’s copy lands on a bead of its own colour.'],
  idea: 'Free play with rings of 3 to 12 beads in two or three colours.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Paint a ring and press Turn until the copy matches.', 'Try a ring of 7 beads with two colours. How many turns until it matches?', 'Can you paint a ring that a flip matches but no turn does?'],
  parent: {
    notice: 'Which rings come back after fewer turns than they have beads.',
    prompt: 'On 12 beads, after how many turns can a ring first look the same?',
    explanation: 'The first matching turn always divides the number of beads, so on a prime number of beads a ring with two colours never matches before a whole turn. Flips add mirror lines; a ring that no turn or flip matches is lopsided.',
    extension: 'Find a lopsided ring of 7 beads with two colours.',
    connection: 'The cyclic and dihedral groups acting on colourings of a cycle.',
    sourceIds: ['beads-week33', 'beads-week34', 'beads-golomb', 'beads-albertson']
  },
  provenance: 'Week 33 and 34 materials: building rings, turning a start arrow, and tracing-paper turns and flips.'
};

const sourceIds = a => [a.group ? 'beads-week34' : 'beads-week33', ...(a.group ? ['beads-albertson'] : a.parameters.windows ? ['beads-debruijn'] : ['beads-golomb', 'beads-oeis'])];
const controlsFor = q => q.mode === 'every' ? (q.windows ? `${CONTROLS.windows} ${CONTROLS.every}` : CONTROLS.every) : q.windows ? `${CONTROLS.windows} Press No ring can if you are sure no ring works.` : null;
const puzzles = authored.map(a => {
  const q = {...a.parameters}, hidden = Boolean(a.group);
  const p = {
    id: `beads-${hidden ? 'h' : ''}${String(a.number).padStart(2, '0')}`, number: a.number, title: a.title, band: 'all', difficulty_level: a.difficulty_level,
    mechanic: hidden ? 'lopsided' : 'beads', ...(hidden ? {libraryFamily: 'beads', group: GROUP} : {}), familyTitle: family.title, revision: 1,
    parameters: q,
    objective: a.objective, ...(a.visibleObjective !== undefined ? {visibleObjective: a.visibleObjective} : {}), instruction: a.visibleObjective || a.objective,
    controls: hidden ? (q.fewest ? CONTROLS.fewest(q.fewest === 'colours' ? 'colours' : 'gold beads') : q.mode === 'every' ? `${CONTROLS.hidden} ${CONTROLS.every}` : `${CONTROLS.hidden} Press No ring can if you are sure no ring works.`) : controlsFor(q) || CONTROLS.turns,
    rules: hidden ? [...HIDDEN_RULES, ...(q.mode === 'every' ? ['A turned or flipped ring is the same ring.'] : [])] : [...family.rules, ...(q.mode === 'every' ? ['Flipping a ring over is not allowed, so a ring and its mirror image can be different.'] : [])],
    idea: a.idea, prerequisites: a.prerequisites, hints: a.hints,
    parent: {...a.parent, sourceIds: sourceIds(a)},
    provenance: a.provenance, sourceDocument: 'docs/beads/README.md'
  };
  // Witnesses: every class for "every"; a ring, or none, for "make"; the
  // fewest count and a ring for "fewest".
  const found = answers(p);
  if (q.mode === 'every') { if (!found.length) throw new Error(`${p.id}: nothing to find`); q.answers = found.length; p.solution = {rings: found}; }
  else if (q.fewest) { const least = fewestOf(p); p.solution = {fewest: least, ring: allWords(q.n, q.colours).find(w => lopsided(w) && measure(p, w) === least)}; }
  else p.solution = found.length ? {ring: allWords(q.n, q.colours).find(w => fits(p, w)), classes: found.length} : {ring: null};
  if (q.windows && q.n !== q.colours ** q.windows) throw new Error(`${p.id}: a ring with every window once has colours^k beads`);
  return p;
});
const pg = {...playground, mechanic: 'beads', familyTitle: family.title, revision: 1, instruction: playground.objective, sourceDocument: 'docs/beads/README.md'};

const pack = {title: 'Bead rings', version: 1, families: [family], sources, puzzles: [pg, ...puzzles]};
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/beads/beads.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(`${p.id} ${p.mechanic} ${JSON.stringify(p.parameters)} → ${JSON.stringify(p.solution)}`);
  console.log(`classes check: ${ringClasses(5, 2).length} rings of five beads`);
}
