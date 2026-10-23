// Checks the Who knows pack (dist/families/knowledge/knowledge.json) by a
// model unlike the mechanic's: worlds are bit masks, each agent's view is a
// partition of the table into the worlds it cannot tell apart (café: by its
// own card; dolls: by every headband but its own), and a reply is decided
// once per block of that partition. Instead of filtering the table step by
// step, every world's whole history (its conversation, or its rounds of
// replies) is simulated from scratch, and the table after k steps is the set
// of worlds whose first k answers match. With that model it checks every
// puzzle's tables, answers and proving round, the theorems and the claims in
// the grown-up notes (k blue dolls prove in round k − m + 1, never without
// the announcement; the café's four conversations; the sequential leak), and
// then, through the engine: the witness, every wrong Next (a card wrongly
// kept or removed) and every wrong reply refused with a true certificate,
// Can't refused until a round removes nothing, hint chains from fresh, after
// random play and after Undo, illegal moves, forged saves, every Undo press
// changing the screen, copy that gives no count away, and the playground.
// Run: node scripts/validate-knowledge.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';

// --- An independent model ---------------------------------------------------------
// World w is a number; bit (n − 1 − i) is 1 when place i is NO (café) or red (dolls).
const bit = (n, i) => 1 << (n - 1 - i);
const name = (kind, n, w) => Array.from({length: n}, (_, i) => (w & bit(n, i) ? (kind === 'cafe' ? 'N' : 'R') : (kind === 'cafe' ? 'Y' : 'B'))).join('');
const mask = (kind, s) => [...s].reduce((m, c) => m * 2 + (c === 'N' || c === 'R' ? 1 : 0), 0);
const range = n => Array.from({length: 2 ** n}, (_, w) => w);
const blueCount = (n, w) => n - popcount(w);
function popcount(x) { let c = 0; for (; x; x &= x - 1) c++; return c; }
// The blocks of an agent's view: café person i sees bit i; doll k sees all bits but k.
function blocks(table, view) {
  const out = new Map();
  for (const w of table) { const key = view(w); if (!out.has(key)) out.set(key, []); out.get(key).push(w); }
  return out;
}
const cafeView = (n, i) => w => w & bit(n, i);
const dollView = (n, k) => w => w & ~bit(n, k);
// Replies, decided once per block.
function cafeReplies(n, table, i) {
  const out = new Map();
  for (const block of blocks(table, cafeView(n, i)).values()) {
    const yes = block.filter(w => w === 0).length;
    const r = yes === block.length ? 'yes' : yes === 0 ? 'no' : 'notyet';
    for (const w of block) out.set(w, r);
  }
  return out;
}
function dollReplies(n, table, k) {
  const out = new Map();
  for (const block of blocks(table, dollView(n, k)).values()) {
    const r = block.every(w => !(w & bit(n, k))) ? 'prove' : 'notyet';
    for (const w of block) out.set(w, r);
  }
  return out;
}
// A world's whole café conversation, simulated from scratch.
function conversationOf(n, w) {
  let table = range(n);
  const said = [];
  for (let i = 0; i < n; i++) {
    const rep = cafeReplies(n, table, i), r = rep.get(w);
    said.push(r);
    table = table.filter(v => rep.get(v) === r);
  }
  return said;
}
// Every café conversation that can happen, with its worlds.
function cafeGroups(n) {
  const g = new Map();
  for (const w of range(n)) { const k = conversationOf(n, w).join('/'); if (!g.has(k)) g.set(k, []); g.get(k).push(w); }
  return g;
}
// A deal's rounds of replies, simulated from scratch, after "at least m are blue".
function historyOf(n, m, deal, rounds) {
  let table = range(n).filter(w => blueCount(n, w) >= m);
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const reps = Array.from({length: n}, (_, k) => dollReplies(n, table, k));
    const row = reps.map(rep => rep.get(deal));
    out.push(row);
    table = table.filter(v => reps.every((rep, k) => rep.get(v) === row[k]));
  }
  return out;
}
// The first round in which every blue doll proves (null if none within `cap`).
function provingRound(n, m, deal, cap = 8) {
  const h = historyOf(n, m, deal, cap), blue = k => !(deal & bit(n, k));
  const r = h.findIndex(row => row.every((x, k) => !blue(k) || x === 'prove'));
  return blueCount(n, deal) > 0 && r >= 0 ? r + 1 : null;
}
// Tables after each step of a fixed list of events: the worlds whose history so far matches.
function cafeTables(n, said) {
  const all = range(n), conv = new Map(all.map(w => [w, conversationOf(n, w)]));
  return Array.from({length: said.length + 1}, (_, k) => all.filter(w => said.slice(0, k).every((r, i) => conv.get(w)[i] === r)));
}
function dollTables(n, m, rounds) {
  const all = range(n), out = [all];
  if (m) out.push(all.filter(w => blueCount(n, w) >= m));
  const base = out.at(-1), hist = new Map(base.map(w => [w, historyOf(n, m, w, rounds.length)]));
  for (let r = 1; r <= rounds.length; r++) out.push(base.filter(w => hist.get(w).slice(0, r).every((row, j) => row.join() === rounds[j].join())));
  return out;
}
// For a coached deal: the replies of every round until every blue doll proves
// (or the table stops changing), and the tables between.
function coachTables(n, m, deal) {
  const proved = provingRound(n, m, deal);
  const rounds = historyOf(n, m, deal, proved || 1);
  const t = dollTables(n, m, rounds);
  return {proved, rounds, tables: proved ? t.slice(0, -1) : t};
}

// --- Play through the engine ----------------------------------------------------------
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => undo(a);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
const view = (p, a) => mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
const movesOf = html => [...html.matchAll(/data-move="([^"]+)"/g)].map(x => JSON.parse(x[1].replace(/&quot;/g, '"')));
// The refusal a control would give: the ui payload of the button with this class.
function refusalOn(html, cls) {
  const m = html.match(new RegExp(`class="[^"]*${cls}[^"]*" data-action="mechanic-ui" data-ui='([^']+)'`));
  return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")) : null;
}

function hintSolve(p, a, limit = 200) {
  let k = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint names a move from ${JSON.stringify(a.board)}`);
    assert.ok(h.text && !/^Press Can’t/.test(h.text), `${p.id}: hint text "${h.text}"`);
    a = play(p, a, [h.action]);
    assert.ok(++k <= limit, `${p.id}: hints finish within ${limit} moves`);
  }
  return k;
}
// Random legal play: any control the board offers, as a child might tap.
function wander(p, a, rnd, steps) {
  for (let s = 0; s < steps && !isSolved(p, a.board); s++) {
    const live = movesOf(view(p, a)).map(action => move(p, a, action)).filter(Boolean);
    if (!live.length) break;
    const next = live[Math.floor(rnd() * live.length)];
    if (!isSolved(p, next.board)) a = next;
  }
  return a;
}

export default async function validateKnowledge() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/knowledge/knowledge.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, refusals: 0, hintMoves: 0};
  checkTheorems();
  for (const p of pack.puzzles) {
    const q = p.parameters;
    if (q.mode === 'playground') { checkPlayground(p); continue; }
    report.puzzles++;
    const n = q.n, kind = q.kind;
    const names = list => list.map(w => name(kind, n, w));
    // Answers by the independent model.
    if (q.mode === 'fit') {
      const tables = kind === 'cafe' ? cafeTables(n, q.said) : dollTables(n, q.least || 0, q.rounds);
      assert.deepEqual(p.solution.tables, tables.map(names), `${p.id}: every table`);
      assert.deepEqual(p.solution.left, names(tables.at(-1)));
    } else if (q.mode === 'design') {
      const groups = cafeGroups(n), hits = [...groups].filter(([, ws]) => ws.length === q.target);
      assert.equal(hits.length, 1, `${p.id}: one conversation leaves ${q.target}`);
      assert.deepEqual(p.solution.said.join('/'), hits[0][0]);
      assert.deepEqual(p.solution.left, names(hits[0][1]));
      assert.equal(p.solution.conversations.length, groups.size, `${p.id}: every conversation`);
    } else {
      const c = coachTables(n, q.least || 0, mask('dolls', q.deal));
      assert.equal(p.solution.proved, c.proved, `${p.id}: proving round`);
      assert.deepEqual(p.solution.rounds, c.rounds, `${p.id}: replies`);
      assert.deepEqual(p.solution.tables, c.tables.map(names), `${p.id}: tables`);
      if (c.proved === null) assert.ok(q.cant, `${p.id}: a puzzle that can’t be done has Can’t`);
    }
    // Copy never gives a count or an answer away.
    for (const text of [p.title, p.objective, p.visibleObjective, p.controls]) assert.ok(!/\d/.test(text), `${p.id}: no number in "${text}"`);
    for (const text of [p.objective, p.visibleObjective, p.hints[0]]) assert.ok(!/round (one|two|three|four)|\bin round\b/i.test(text), `${p.id}: "${text}" names no round`);
    if (q.mode === 'fit') { const k = p.solution.left.length, word = ['zero', 'one', 'two', 'three', 'four'][k]; for (const text of [p.title, p.visibleObjective, p.hints[0]]) assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(text), `${p.id}: "${text}" does not give the count away`); }
    report.refusals += checkWitnessAndRefusals(p);
    checkIllegal(p);
    checkSaves(p);
    // Hints: from fresh, after wandering, and after Undo.
    report.hintMoves += hintSolve(p, freshAttempt(p));
    for (let seed = 1; seed <= 8; seed++) {
      const rnd = seeded(seed * 131 + p.number);
      let a = wander(p, freshAttempt(p), rnd, 10 + seed * 6);
      report.hintMoves += hintSolve(p, a);
      for (let k = 0; k < 1 + seed % 4 && a.history.length; k++) a = takeBack(p, a);
      assert.ok(validBoard(p, a.board), `${p.id}: an undone board is valid`);
      report.hintMoves += hintSolve(p, a);
    }
    checkUndoPresses(p);
  }
  assert.equal(pack.puzzles.filter(p => p.parameters.mode !== 'playground').length, 13);
  return report;
}

// The theorems and the claims in the notes, by the independent model only.
function checkTheorems() {
  // k blue dolls prove first in round k − m + 1 after "at least m are blue";
  // red dolls never prove; without an announcement nobody ever proves.
  for (const n of [1, 2, 3, 4, 5]) for (const m of [0, 1, 2]) for (const deal of range(n)) {
    const k = blueCount(n, deal);
    if (k < m) continue; // the deal is not on the table after the announcement
    const h = historyOf(n, m, deal, 7);
    if (m === 0) { assert.ok(h.every(row => row.every(x => x === 'notyet')), `n ${n}: ${name('dolls', n, deal)} never proves without the announcement`); continue; }
    const first = k - m + 1;
    h.forEach((row, r) => row.forEach((x, d) => {
      const blue = !(deal & bit(n, d));
      assert.equal(x, blue && r + 1 >= first ? 'prove' : 'notyet', `n ${n}, m ${m}: ${name('dolls', n, deal)} doll ${d + 1} round ${r + 1}`);
    }));
  }
  for (const n of [2, 3, 4]) for (const deal of range(n)) assert.equal(provingRound(n, 0, deal), null);
  // No announcement: every reply on every card is NOT YET, so a round removes nothing.
  for (const n of [2, 3, 4]) for (let k = 0; k < n; k++) assert.ok([...dollReplies(n, range(n), k).values()].every(x => x === 'notyet'));
  // The café: the conversations and their deals.
  const two = cafeGroups(2), three = cafeGroups(3), four = cafeGroups(4);
  assert.deepEqual(Object.fromEntries([...two].map(([k, ws]) => [k, ws.map(w => name('cafe', 2, w))])), {'notyet/yes': ['YY'], 'notyet/no': ['YN'], 'no/no': ['NY', 'NN']});
  assert.deepEqual(Object.fromEntries([...three].map(([k, ws]) => [k, ws.length])), {'notyet/notyet/yes': 1, 'notyet/notyet/no': 1, 'notyet/no/no': 2, 'no/no/no': 4});
  assert.deepEqual([...four].filter(([, ws]) => ws.length === 2).map(([k]) => k), ['notyet/notyet/no/no'], 'four people: only the first NO from person 3 leaves two');
  // After the first NO every later answer is NO: a later NO need not mean a NO card.
  for (const n of [2, 3, 4]) for (const w of range(n)) { const c = conversationOf(n, w), i = c.indexOf('no'); if (i >= 0) assert.ok(c.slice(i).every(x => x === 'no')); }
  assert.deepEqual(conversationOf(3, mask('cafe', 'NYY')), ['no', 'no', 'no'], 'person 2 holds YES and says NO');
  // Puzzle 3's note: BB gives NOT YET twice and BR PROVE BLUE, NOT YET in round 1.
  assert.deepEqual(historyOf(2, 1, mask('dolls', 'BB'), 1)[0], ['notyet', 'notyet']);
  assert.deepEqual(historyOf(2, 1, mask('dolls', 'BR'), 1)[0], ['prove', 'notyet']);
  // Puzzle 7's note: only BRR gives PROVE BLUE, NOT YET, NOT YET in round 1.
  assert.deepEqual(range(3).filter(w => blueCount(3, w) >= 1 && historyOf(3, 1, w, 1)[0].join() === 'prove,notyet,notyet').map(w => name('dolls', 3, w)), ['BRR']);
  // Puzzle 8's note: the private views of BBR, and the leak of a sequential protocol.
  const seven = range(3).filter(w => blueCount(3, w) >= 1), bbr = mask('dolls', 'BBR');
  assert.deepEqual([0, 1, 2].map(k => seven.filter(v => dollView(3, k)(v) === dollView(3, k)(bbr)).map(v => name('dolls', 3, v)).sort()), [['BBR', 'RBR'], ['BBR', 'BRR'], ['BBB', 'BBR']]);
  const after1 = seven.filter(v => dollReplies(3, seven, 0).get(v) === dollReplies(3, seven, 0).get(bbr));
  assert.ok(!after1.includes(mask('dolls', 'BRR')), 'doll 1’s NOT YET alone removes BRR');
  assert.equal(dollReplies(3, after1, 1).get(bbr), 'prove', 'then doll 2 would prove in round 1');
  // Puzzle 11's note: every deal is told apart by round 2, and BBB is pinned down after two silent rounds.
  const hist2 = seven.map(w => JSON.stringify(historyOf(3, 1, w, 2)));
  assert.equal(new Set(hist2).size, 7, 'seven deals, seven histories by round 2');
  assert.equal(new Set(seven.map(w => JSON.stringify(historyOf(3, 1, w, 1)))).size, 4, 'round 1 alone gives four groups');
  assert.deepEqual(dollTables(3, 1, [['notyet', 'notyet', 'notyet'], ['notyet', 'notyet', 'notyet']]).at(-1), [mask('dolls', 'BBB')]);
  // Which replies appear, ignoring which doll: the one-blue deals never separate.
  const unordered = w => historyOf(3, 1, w, 4).map(row => [...row].sort().join()).join('/');
  assert.equal(new Set(['BRR', 'RBR', 'RRB'].map(s => unordered(mask('dolls', s)))).size, 1);
  // Puzzle 13's note: eleven cards after the announcement, five after round 1.
  const t13 = coachTables(4, 2, mask('dolls', 'BBBR')).tables.map(t => t.length);
  assert.deepEqual(t13, [16, 11, 5]);
  // The playground note: with three dolls only BBB takes three rounds.
  assert.deepEqual(range(3).filter(w => provingRound(3, 1, w) === 3).map(w => name('dolls', 3, w)), ['BBB']);
}

// The witness, and every wrong Next and wrong reply along it refused with a true certificate.
function checkWitnessAndRefusals(p) {
  const q = p.parameters, n = q.n, kind = q.kind, m = mechanicFor(p);
  let a = freshAttempt(p), refused = 0;
  const S = () => view(p, a);
  // The table of the current step, and the cards it should lose, by the model.
  const removeStep = (table, keep) => {
    const off = table.filter(w => !keep.includes(w)).map(w => name(kind, n, w)), on = keep.map(w => name(kind, n, w));
    // Every single slip: one card wrongly kept, or one fitting card removed.
    for (const slip of off) {
      const b = play(p, a, off.filter(x => x !== slip).map(card => ({type: 'card', card})));
      refuse(p, b, {type: 'next'}, `Next with ${slip} kept`);
      m.reset(p);
      const told = refusalOn(view(p, b), 'wk-next');
      assert.ok(told && told.told.why === 'kept' && told.told.cards[0] === slip, `${p.id}: the refusal names ${slip}`);
      refused++;
    }
    for (const slip of on) {
      const b = play(p, a, [...off, slip].map(card => ({type: 'card', card})));
      refuse(p, b, {type: 'next'}, `Next with ${slip} removed`);
      m.reset(p);
      const told = refusalOn(view(p, b), 'wk-next');
      assert.ok(told && told.told.why === 'removed' && told.told.cards[0] === slip, `${p.id}: the refusal names ${slip}`);
      refused++;
    }
    a = play(p, a, [...off.map(card => ({type: 'card', card})), {type: 'next'}]);
  };
  if (q.mode === 'fit') {
    const tables = kind === 'cafe' ? cafeTables(n, q.said) : dollTables(n, q.least || 0, q.rounds);
    for (let k = 0; k + 1 < tables.length; k++) { assert.ok(!isSolved(p, a.board)); removeStep(tables[k], tables[k + 1]); }
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    return refused;
  }
  if (q.mode === 'design') {
    const conv = conversationOf(n, mask('cafe', p.solution.left[0]));
    const tables = cafeTables(n, conv);
    for (let k = 0; k < n; k++) {
      // Every answer no card gives is refused, with its refusal shown.
      for (const r of ['yes', 'no', 'notyet']) {
        const can = [...cafeReplies(n, tables[k], k).entries()].some(([w, x]) => tables[k].includes(w) && x === r);
        if (!can) {
          refuse(p, a, {type: 'say', reply: r}, `an answer no card gives (${r})`);
          m.reset(p);
          const told = refusalOn(S(), `wk-r-${r}`);
          assert.ok(told && told.told.why === 'cannot', `${p.id}: the ${r} button refuses`);
        }
      }
      a = play(p, a, [{type: 'say', reply: conv[k]}]);
      removeStep(tables[k], tables[k + 1]);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    // Another conversation finishes without solving; Again starts over.
    let b = play(p, freshAttempt(p), [{type: 'say', reply: 'no'}]);
    const t = cafeTables(n, ['no', 'no', 'no']);
    b = play(p, b, [...t[0].filter(w => !t[1].includes(w)).map(w => ({type: 'card', card: name('cafe', n, w)})), {type: 'next'}, {type: 'say', reply: 'no'}, {type: 'next'}, {type: 'say', reply: 'no'}, {type: 'next'}]);
    assert.ok(!isSolved(p, b.board), `${p.id}: four deals is not two`);
    refuse(p, b, {type: 'say', reply: 'no'}, 'an answer after the last person');
    assert.deepEqual(play(p, b, [{type: 'again'}]).board, freshAttempt(p).board);
    return refused;
  }
  // Coach.
  const deal = mask('dolls', q.deal), c = coachTables(n, q.least || 0, deal);
  let t = 0;
  if (q.least) { removeStep(c.tables[0], c.tables[1]); t = 1; }
  for (let r = 0; ; r++) {
    const table = c.tables[t], truth = c.rounds[r];
    // Can't: refused unless the last round removed nothing.
    if (q.cant) {
      const last = r > 0 && c.tables[t].length === c.tables[t - 1].length;
      if (last) { a = play(p, a, [{type: 'cant'}]); assert.ok(isSolved(p, a.board), `${p.id}: Can’t after an unchanged round`); assert.equal(c.proved, null); return refused; }
      refuse(p, a, {type: 'cant'}, `Can’t in round ${r + 1}`);
      if (r > 0) { m.reset(p); const told = refusalOn(S(), 'wk-cant'); assert.ok(told && told.told.why === 'never', `${p.id}: Can’t says cards left`); }
    }
    // Every wrong reply for every doll is refused by Show with a true certificate.
    for (let k = 0; k < n; k++) {
      const wrong = truth.map((x, d) => (d === k ? (x === 'prove' ? 'notyet' : 'prove') : x));
      const b = play(p, a, wrong.map((reply, doll) => ({type: 'reply', doll, reply})));
      refuse(p, b, {type: 'show'}, `doll ${k + 1} replying ${wrong[k]}`);
      m.reset(p);
      const told = refusalOn(view(p, b), 'wk-show')?.told;
      const fits = table.filter(v => dollView(n, k)(v) === dollView(n, k)(deal)).map(v => name('dolls', n, v));
      assert.equal(told.doll, k);
      if (truth[k] === 'prove') { assert.equal(told.why, 'can'); assert.deepEqual([...told.cards].sort(), [...fits].sort()); assert.ok(told.cards.every(v => v[k] === 'B')); }
      else { assert.equal(told.why, 'could'); assert.ok(fits.includes(told.cards[0]) && told.cards[0][k] === 'R'); }
      refused++;
    }
    a = play(p, a, [...truth.map((reply, doll) => ({type: 'reply', doll, reply})), {type: 'show'}]);
    if (c.proved === r + 1) { assert.ok(isSolved(p, a.board), `${p.id}: every blue doll proves in round ${r + 1}`); return refused; }
    assert.ok(!isSolved(p, a.board));
    removeStep(table, c.tables[t + 1]);
    t++;
  }
}

function checkIllegal(p) {
  const q = p.parameters, fresh = freshAttempt(p), all = p.solution.tables?.[0] || [];
  refuse(p, fresh, {type: 'nonsense'}, 'an unknown move');
  refuse(p, fresh, {type: 'next', extra: 1}, 'a move with an unknown field');
  refuse(p, fresh, {type: 'size', n: 4}, 'a set-up move outside the playground');
  refuse(p, fresh, {type: 'card', card: 'XYZ'}, 'a card that is not on the table');
  if (q.mode === 'fit' || q.mode === 'design') { refuse(p, fresh, {type: 'show'}, 'Show outside the dolls'); refuse(p, fresh, {type: 'cant'}, 'Can’t outside the dolls'); }
  if (q.mode === 'design') { refuse(p, fresh, {type: 'next'}, 'Next before an answer'); refuse(p, fresh, {type: 'card', card: 'YYY'}, 'a card before an answer'); refuse(p, fresh, {type: 'again'}, 'Again before anything'); }
  if (q.mode === 'coach') {
    refuse(p, fresh, {type: 'again'}, 'Again in a puzzle');
    if (q.least) { refuse(p, fresh, {type: 'reply', doll: 0, reply: 'prove'}, 'a reply before the announcement is dealt with'); refuse(p, fresh, {type: 'show'}, 'Show before the announcement is dealt with'); }
    else {
      refuse(p, fresh, {type: 'card', card: all[0]}, 'removing a card before the replies are shown');
      refuse(p, fresh, {type: 'show'}, 'Show before every reply is chosen');
      refuse(p, fresh, {type: 'reply', doll: q.n, reply: 'prove'}, 'a doll that does not exist');
      refuse(p, fresh, {type: 'reply', doll: 0, reply: 'maybe'}, 'an unknown reply');
    }
    refuse(p, fresh, {type: 'cant'}, 'Can’t before a round');
  }
  // Removed cards from an earlier step can't be tapped.
  if (q.mode === 'fit') {
    const [t0, t1] = p.solution.tables, off = t0.filter(w => !t1.includes(w));
    if (off.length) { const a = play(p, fresh, [...off.map(card => ({type: 'card', card})), {type: 'next'}]); refuse(p, a, {type: 'card', card: off[0]}, 'a card already gone'); }
  }
}

function checkSaves(p) {
  const q = p.parameters, fresh = freshAttempt(p).board;
  const forged = [[{...fresh, extra: 1}, 'an unknown field'], [{...fresh, steps: -1}, 'negative steps'], [{...fresh, steps: 99}, 'steps past the end'], [{...fresh, out: 'x'}, 'out that is not a list'], [{...fresh, out: ['QQQ']}, 'a card that does not exist']];
  if (q.mode === 'fit') forged.push([{...fresh, out: [p.solution.tables[0][0], p.solution.tables[0][0]]}, 'a card taken off twice']);
  if (q.mode === 'design') forged.push([{...fresh, said: ['yes']}, 'an answer no card gives'], [{...fresh, said: ['no', 'notyet'], steps: 1}, 'NOT YET after a NO'], [{...fresh, said: ['notyet', 'notyet'], steps: 0}, 'two answers ahead of the table']);
  if (q.mode === 'coach') {
    const truth = p.solution.rounds[0], wrong = truth.map(x => (x === 'prove' ? 'notyet' : 'prove'));
    const r1 = q.least ? 1 : 0;
    forged.push([{...fresh, cant: true}, 'Can’t before a round'], [{...fresh, replies: fresh.replies.slice(1)}, 'too few replies'], [{...fresh, steps: r1, replies: wrong, shown: true}, 'wrong replies shown']);
    if (q.least) forged.push([{...fresh, replies: truth}, 'replies during the announcement']);
    else forged.push([{...fresh, out: [p.solution.tables[0][0]]}, 'a card off before Show']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// Every Undo press changes the screen.
function checkUndoPresses(p) {
  const m = mechanicFor(p), draw = a => { m.reset(p); return view(p, a); };
  for (let seed = 1; seed <= 3; seed++) {
    let a = wander(p, freshAttempt(p), seeded(p.number * 31 + seed), 25);
    let shown = draw(a);
    while (a.history.length) { a = undoPress(p, a, draw); const now = draw(a); assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`); shown = now; }
  }
}

function checkPlayground(p) {
  const m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'done');
  // Every deal of two to four dolls, with and without the announcement, played to its end.
  for (const n of [2, 3, 4]) {
    if (a.board.n !== n) a = play(p, a, [{type: 'size', n}]);
    for (const deal of range(n)) for (const least of [1, 0]) {
      const target = name('dolls', n, deal);
      if (least && !target.includes('B')) continue;
      if (a.board.least !== least) { if (least && !a.board.deal.includes('B')) a = play(p, a, [{type: 'flip', doll: 0}]); a = play(p, a, [{type: 'announce', on: !!least}]); }
      // Blue first, then red, so the announcement always keeps a blue headband.
      for (const want of ['B', 'R']) for (let k = 0; k < n; k++) if (target[k] === want && a.board.deal[k] !== want) a = play(p, a, [{type: 'flip', doll: k}]);
      assert.equal(a.board.deal, target);
      const c = coachTables(n, least, deal);
      let t = 0;
      const removeTo = keep => { const off = c.tables[t].filter(w => !keep.includes(w)).map(w => name('dolls', n, w)); a = play(p, a, [...off.map(card => ({type: 'card', card})), {type: 'next'}]); t++; };
      if (least) removeTo(c.tables[1]);
      for (let r = 0; r < c.rounds.length; r++) {
        a = play(p, a, [...c.rounds[r].map((reply, doll) => ({type: 'reply', doll, reply})), {type: 'show'}]);
        if (c.proved === r + 1) break;
        removeTo(c.tables[t + 1]);
      }
      assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
      if (c.proved) refuse(p, a, {type: 'card', card: target}, 'a move once every blue doll has proved');
      refuse(p, a, {type: 'size', n: n === 4 ? 2 : n + 1}, 'set-up after the first move');
      a = play(p, a, [{type: 'again'}]);
    }
  }
  // The announcement can't be on with no blue headband.
  let b = play(p, freshAttempt(p), [{type: 'size', n: 2}]);
  b = play(p, b, [{type: 'flip', doll: 0}]);
  refuse(p, b, {type: 'flip', doll: 1}, 'the last blue headband while the announcement is on');
  b = play(p, b, [{type: 'announce', on: false}, {type: 'flip', doll: 1}]);
  refuse(p, b, {type: 'announce', on: true}, 'the announcement with no blue headband');
  // Eight rounds without the announcement, then only Again.
  let c = play(p, b, [{type: 'flip', doll: 0}]);
  for (let r = 0; r < 8; r++) c = play(p, c, [{type: 'reply', doll: 0, reply: 'notyet'}, {type: 'reply', doll: 1, reply: 'notyet'}, {type: 'show'}, {type: 'next'}]);
  refuse(p, c, {type: 'reply', doll: 0, reply: 'notyet'}, 'a ninth round');
  for (const [board, why] of [[{...a.board, n: 5}, 'five dolls'], [{...a.board, deal: 'BXR'}, 'an unknown headband'], [{...a.board, least: 1, deal: 'RRR'}, 'the announcement with no blue'], [{...a.board, cant: false}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateKnowledge(), null, 2));
