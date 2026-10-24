// Shrink strips: growing and shrinking with ghosts, marks and stuck rows, the
// child's tree as the certificate, the three modes (every way of placing
// seams, the impostor in a strip, every repair of a flipped tile) with an
// unjudged shelf and That's all, the view state (the chosen tile, the piece in
// the work area), hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import {shrinkMechanics, grow, shrinkWord, marked, real, fits, fitsOf, fixesOf, stuck, stuckRuns, leaf, LIMIT, wayAllowed, countNodes} from '../dist/families/shrink/shrink.js';
import {loadPack} from '../scripts/packs.mjs';

const shrink = JSON.parse(await readFile(new URL('../dist/families/shrink/shrink.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = shrinkMechanics.shrink;
const byId = id => shrink.puzzles.find(p => p.id === `shrink-${id}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const carried = (p, from) => { const to = undo(from); return {...to, board: mech.carry(p, from.board, to.board)}; };
const board = html => html.slice(html.indexOf('data-mechanic-wire="shrink"'));
// The moves that take a real row to one tile, from way s on the row at path.
function oneTile(w, s, extra = {}, path = '') {
  const out = [];
  for (;;) {
    out.push({type: 'seam', at: path, s, ...extra}, {type: 'shrink', at: path, s, ...extra});
    w = shrinkWord(w, s); path += s;
    if (w.length === 1) return out;
    s = w.length === 2 ? (w[0] === w[1] ? 1 : 0) : [0, 1].find(t => fits(w, t));
  }
}
const keepOff = html => /class="sk-button sk-keep"[^>]*disabled/.test(html);

test('rows grow from one tile into the Thue–Morse word', () => {
  let w = 'A';
  for (let i = 0; i < 4; i++) w = grow(w);
  assert.equal(w, 'ABBABAABBAABABBA');
  assert.equal(grow('B'), 'BA');
});

test('shrinking: two ways, ghosts at the ends, marks on AA and BB', () => {
  assert.equal(shrinkWord('ABA', 0), 'AA', 'AB|A(B)');
  assert.equal(shrinkWord('ABA', 1), 'BB', '(B)A|BA');
  assert.equal(shrinkWord('ABABA', 0), 'AAA');
  assert.equal(shrinkWord('ABABA', 1), 'BBB');
  assert.equal(shrinkWord('AA', 1), 'BA', '(B)A|A(B)');
  assert.deepEqual(marked('AABB', 0), [0, 2]);
  assert.deepEqual(marked('AABB', 1), []);
  assert.equal(shrinkWord('AABB', 0), null, 'a marked way has no shrunk row');
  assert.equal(shrinkWord('AABB', 1), 'BAB');
});

test('real rows shrink to one tile; stuck rows are certified by the child’s tree', () => {
  for (const w of ['A', 'AB', 'AA', 'ABA', 'ABAB', 'ABBAABBA', 'BAABA', 'ABBABAABABBABAAB']) assert.ok(real(w), w);
  for (const w of ['AAA', 'BBB', 'ABABA', 'AABBAABB', 'BABBAABA', 'ABAABABBABAABA']) assert.ok(!real(w), w);
  assert.ok(fits('ABAB', 0) && !fits('ABAB', 1), 'ABAB with the first tile alone gives BBB');
  // ABABA: both ways tried and shrunk, each shrunk row tried both ways.
  const both = {s: 1, t: [true, true], k: [null, null]};
  const tree = {s: 1, t: [true, true], k: [both, both]};
  assert.ok(stuck(tree, 'ABABA'));
  assert.ok(!stuck({s: 1, t: [true, true], k: [both, null]}, 'ABABA'), 'one way left unshrunk');
  assert.ok(!stuck({s: 1, t: [true, true], k: [null, null]}, 'ABAB'), 'no marks to show');
  assert.ok(!stuck({s: 1, t: [true, true], k: [null, null]}, 'AA'), 'a row of two is never stuck');
  assert.ok(stuck({s: 1, t: [true, true], k: [null, null]}, 'AAA'));
});

test('the answers', () => {
  assert.deepEqual(fitsOf(['ABA', 'BAABA', 'AABB']), [[0, 0], [0, 1], [1, 0], [2, 1]]);
  assert.deepEqual(fitsOf(['ABAB', 'BAB', 'ABBAABBA']), [[0, 0], [1, 0], [1, 1], [2, 0]]);
  assert.deepEqual(fixesOf('AABBBABA'), [4]);
  assert.deepEqual(fixesOf('ABBABBAB'), [1, 4, 5]);
  assert.deepEqual(fixesOf('AABBAABB'), [0, 7]);
  assert.deepEqual(stuckRuns(byId('02').parameters)[0], [0, 4]);
  assert.deepEqual(stuckRuns(byId('07').parameters), [[8, 12], [7, 12], [8, 13]]);
});

test('impostor: choose tiles, place seams, shrink; solved when the chosen tiles are stuck', () => {
  const p = byId('02');
  let a = play(p, freshAttempt(p), {type: 'select', a: 0, b: 3});
  assert.equal(move(p, a, {type: 'shrink', at: '', s: 0}), null, 'Shrink waits for seams');
  a = play(p, a, {type: 'seam', at: '', s: 1}, {type: 'shrink', at: '', s: 1});
  a = play(p, a, {type: 'seam', at: '1', s: 0}, {type: 'seam', at: '1', s: 1});
  assert.equal(a.board.tree.k[1].t.join(), 'true,true');
  assert.ok(stuck(a.board.tree.k[1], 'BBB'), 'BBB is stuck');
  assert.ok(!isSolved(p, a.board), 'ABAB paired from the first tile still fits');
  a = play(p, a, {type: 'seam', at: '', s: 0}, {type: 'shrink', at: '', s: 0});
  assert.equal(move(p, a, {type: 'shrink', at: '0', s: 0}), null, 'AA paired marks a pair: no Shrink');
  a = play(p, a, {type: 'seam', at: '0', s: 1}, {type: 'shrink', at: '0', s: 1}, {type: 'seam', at: '01', s: 0}, {type: 'shrink', at: '01', s: 0});
  assert.ok(!isSolved(p, a.board), 'ABAB shrinks to one tile');
  assert.match(view(p, a), /sk-row one/, 'a row of one tile is drawn');
  // ABABA.
  a = play(p, a, {type: 'select', a: 1, b: 5});
  assert.deepEqual(a.board.tree, leaf(), 'a new choice starts a new row');
  for (const s of [0, 1]) a = play(p, a, {type: 'seam', at: '', s}, {type: 'shrink', at: '', s}, {type: 'seam', at: `${s}`, s: 0}, {type: 'seam', at: `${s}`, s: 1});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /sk-tile b sel caught/);
  assert.doesNotMatch(board(html), /class="sk-gap/, 'no seams to tap once solved');
  assert.doesNotMatch(board(html), /class="sk-told/, 'no message: the crosses show it');
});

test('impostor: at most k tiles, chosen by two taps; a far tap is refused in words', () => {
  const p = byId('02'), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'select', a: 0, b: 6}), null, 'seven tiles');
  view(p, a);
  mech.ui(p, {anchor: 2});
  let html = view(p, a, true);
  assert.match(html, /sk-tile a anchor/);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;select&quot;,&quot;a&quot;:2,&quot;b&quot;:7\}"/, 'six tiles away is a choice');
  assert.match(html, /data-ui="\{&quot;far&quot;:true\}"[^>]*data-sk-i="9"|data-sk-i="9"[^>]*data-ui="\{&quot;far&quot;:true\}"/, 'eight tiles away is too far');
  mech.ui(p, {far: true});
  html = view(p, a, true);
  assert.match(html, /At most 6 tiles\./);
  assert.doesNotMatch(html, /sk-tile [ab] anchor/, 'the far tap drops the first tile');
});

test('seams: Keep waits until the rows reach one tile; That’s all judges once and its refusal stays through Undo', () => {
  const p = byId('04');
  let a = freshAttempt(p);
  assert.ok(keepOff(view(p, a)), 'nothing to keep before seams');
  // ABAB with the first tile alone marks nothing on top but shrinks to BBB,
  // which is stuck: it can never be kept, so That's all can't be asked about it.
  a = play(p, a, {type: 'seam', piece: 0, at: '', s: 1});
  assert.ok(keepOff(view(p, a)), 'Keep waits for the rows');
  assert.equal(move(p, a, {type: 'keep', piece: 0}), null);
  a = play(p, a, {type: 'shrink', piece: 0, at: '', s: 1}, {type: 'seam', piece: 0, at: '1', s: 0}, {type: 'seam', piece: 0, at: '1', s: 1});
  assert.ok(stuck(a.board.trees[0].k[1], 'BBB'));
  assert.equal(move(p, a, {type: 'keep', piece: 0}), null, 'a way shown stuck is never kept');
  assert.ok(keepOff(view(p, a)));
  // ABAB paired: AA, BA, B. Keep once the last row is one tile.
  const moves = oneTile('ABAB', 0, {piece: 0});
  a = play(p, a, ...moves.slice(0, -1));
  assert.ok(keepOff(view(p, a)), 'not one row early');
  a = play(p, a, moves.at(-1));
  assert.ok(!keepOff(view(p, a)), 'Keep once the rows reach one tile');
  a = play(p, a, {type: 'keep', piece: 0});
  assert.deepEqual(a.board.shelf, [[0, 0]]);
  let html = view(p, a);
  assert.doesNotMatch(board(html), /sk-told/, 'Keep says nothing');
  assert.doesNotMatch(html, /\b\d of \d\b/, 'no count');
  a = play(p, a, {type: 'all'});
  html = view(p, a);
  assert.match(html, /There is another\./);
  assert.match(html, /sk-all[^>]*disabled/);
  assert.equal(move(p, a, {type: 'all'}), null);
  const back = carried(p, a);
  assert.ok(back.board.refused && !back.board.told, 'Undo keeps the refusal, not its note');
  assert.doesNotMatch(view(p, back), /There is another/, 'so the Undo shows');
  assert.equal(move(p, back, {type: 'all'}), null, 'That’s all stays off on the same shelf');
  a = play(p, a, {type: 'drop', piece: 0, s: 0});
  assert.equal(a.board.refused, false, 'taking one back lifts it');
  a = play(p, a, {type: 'keep', piece: 0});
  for (const [i, s, w] of [[1, 0, 'BAB'], [1, 1, 'BAB']]) a = play(p, a, ...oneTile(w, s, {piece: i}), {type: 'keep', piece: i});
  a = play(p, a, {type: 'all'});
  assert.match(view(p, a), /There is another\./);
  a = play(p, a, ...oneTile('ABBAABBA', 0, {piece: 2}), {type: 'keep', piece: 2}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('a shelf saved before Keep waited for one tile still loads, and That’s all names a kept way that gets stuck', () => {
  const p = byId('04'), fresh = freshAttempt(p);
  const old = {...fresh, board: {...fresh.board, shelf: [[0, 1]]}};
  assert.ok(validBoard(p, old.board));
  const a = play(p, old, {type: 'all'});
  assert.match(view(p, a), /One of these gets stuck\./);
});

test('seams: a move or an Undo on another piece brings that piece to the work area', () => {
  const p = byId('01');
  let a = freshAttempt(p);
  view(p, a);
  mech.ui(p, {active: 2});
  a = play(p, a, {type: 'seam', piece: 2, at: '', s: 1});
  assert.match(view(p, a, true), /aria-label="Shrinking"[\s\S]*aria-label="AABB, first tile alone"/);
  mech.ui(p, {active: 0});
  assert.match(view(p, a, true), /aria-label="ABA"/);
  a = undo(a);
  assert.match(view(p, a, true), /aria-label="AABB"/, 'Undo shows the piece it changed');
});

test('repair: one flip at a time; Keep once the rows reach one tile; That’s all', () => {
  const p = byId('09'), fitWay = w => [0, 1].find(t => fits(w, t));
  let a = play(p, freshAttempt(p), {type: 'flip', i: 3});
  assert.equal(a.board.flip, 3);
  a = play(p, a, {type: 'flip', i: 0});
  assert.equal(a.board.flip, 0, 'flipping another puts the first back');
  assert.match(view(p, a), /sk-tile b flipped/);
  assert.equal(move(p, a, {type: 'keep'}), null, 'Keep waits for the rows');
  a = play(p, a, ...oneTile('BABBAABB', fitWay('BABBAABB')), {type: 'keep'}, {type: 'all'});
  assert.equal(a.board.told, 'more');
  a = play(p, a, {type: 'flip', i: 7}, ...oneTile('AABBAABA', fitWay('AABBAABA')), {type: 'keep'}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  // A flip that still gets stuck is never kept: tile 2 makes BBB.
  const b = play(p, freshAttempt(p), {type: 'flip', i: 1}, {type: 'seam', at: '', s: 0}, {type: 'seam', at: '', s: 1});
  assert.equal(move(p, b, {type: 'keep'}), null);
});

test('rows of two tiles end the tree: two different tiles only pair, so no row comes round again', () => {
  assert.ok(wayAllowed('AB', 0) && !wayAllowed('AB', 1) && !wayAllowed('BA', 1));
  assert.ok(wayAllowed('AA', 1) && wayAllowed('BB', 1) && wayAllowed('ABA', 1));
  const p = byId('01');
  // ABA paired gives AA; AA leaves the first tile alone, to BA; BA pairs, to B.
  let a = play(p, freshAttempt(p), {type: 'seam', piece: 0, at: '', s: 0}, {type: 'shrink', piece: 0, at: '', s: 0});
  a = play(p, a, {type: 'seam', piece: 0, at: '0', s: 1}, {type: 'shrink', piece: 0, at: '0', s: 1});
  assert.equal(move(p, a, {type: 'seam', piece: 0, at: '01', s: 1}), null, 'BA can’t leave its first tile alone');
  a = play(p, a, {type: 'seam', piece: 0, at: '01', s: 0}, {type: 'shrink', piece: 0, at: '01', s: 0});
  let html = view(p, a);
  assert.match(html, /aria-label="B, one tile"/);
  assert.doesNotMatch(board(html), /&quot;at&quot;:&quot;010&quot;/, 'nothing to tap on one tile');
  // BA's joins: only its ends, each taking half the row.
  const ba = html.slice(html.indexOf('aria-label="BA, paired from the first tile"'));
  const gaps = [...ba.slice(0, ba.indexOf('</div>')).matchAll(/class="sk-gap[^"]*" style="left:([\d.]+)%;width:([\d.]+)%/g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(gaps, [[0, 50], [50, 50]]);
  // The deepest legal tree of any row is small: Shrink is never refused for size.
  assert.ok(countNodes(a.board.trees[0]) < LIMIT.nodes);
  a = play(p, a, {type: 'seam', piece: 0, at: '', s: 1}, {type: 'shrink', piece: 0, at: '', s: 1}, {type: 'seam', piece: 0, at: '1', s: 1}, {type: 'shrink', piece: 0, at: '1', s: 1}, {type: 'seam', piece: 0, at: '11', s: 0}, {type: 'shrink', piece: 0, at: '11', s: 0});
  html = view(p, a);
  assert.equal((html.match(/class="sk-kids/g) || []).length, 5, 'one fork, then a single column under each side');
  assert.equal((html.match(/sk-kids fork/g) || []).length, 1);
});

test('hints solve every puzzle from fresh and after a wrong start, quickly, and never open with a claim', () => {
  for (const p of shrink.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    const fresh = freshAttempt(p);
    const first = nextHint(p, fresh);
    assert.ok(!['all', 'keep'].includes(first.action.type), `${p.id}: the first hint acts on the board`);
    const starts = [fresh];
    if (p.parameters.mode === 'impostor') starts.push(play(p, fresh, {type: 'select', a: 0, b: 1}, {type: 'seam', at: '', s: 0}));
    if (p.parameters.mode === 'repair') starts.push(play(p, fresh, {type: 'flip', i: 2}, {type: 'seam', at: '', s: 0}, {type: 'seam', at: '', s: 1}));
    if (p.parameters.mode === 'seams') {
      const [i, s] = fitsOf(p.parameters.pieces)[0];
      starts.push(play(p, fresh, {type: 'seam', piece: 2, at: '', s: 1}, ...oneTile(p.parameters.pieces[i], s, {piece: i}), {type: 'keep', piece: i}, {type: 'all'}));
    }
    for (let a of starts) {
      for (let i = 0; i < 90 && !isSolved(p, a.board); i++) {
        const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
        assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
        assert.doesNotMatch(h.text, /\b\d+ (of|left)\b/, `${p.id}: no counts`);
        a = play(p, a, h.action);
      }
      assert.ok(isSolved(p, a.board), `${p.id} solved by hints`);
    }
  }
});

test('hints wait for the child’s own shrinking before judging a run, a flip or a kept way', () => {
  const text = (id, ...moves) => { const p = byId(id); return nextHint(p, play(p, freshAttempt(p), ...moves)).text; };
  assert.equal(text('07', {type: 'select', a: 0, b: 4}), 'Place seams on tiles 1 to 5 and shrink.');
  assert.equal(text('07', {type: 'select', a: 8, b: 12}), 'Place seams on tiles 9 to 13 and shrink.', 'the same words for the impostor');
  assert.equal(text('03', {type: 'flip', i: 0}), 'Place seams on the piece and shrink.');
  assert.equal(text('09', {type: 'flip', i: 0}), 'Place seams on the piece and shrink.', 'the same words for a fix');
  assert.equal(text('04', {type: 'seam', piece: 0, at: '', s: 1}), 'Shrink ABAB.', 'seams placed and not kept are shrunk first');
  assert.equal(text('04', {type: 'seam', piece: 0, at: '', s: 0}), 'Shrink ABAB.', 'the same words for a way that works');
  // Once the child's rows show tiles 1 to 5 reach one tile, the hint names a stuck run.
  const p = byId('07');
  let a = play(p, freshAttempt(p), {type: 'select', a: 0, b: 4});
  for (let i = 0; i < 10 && nextHint(p, a).action.type !== 'select'; i++) a = play(p, a, nextHint(p, a).action);
  assert.match(a.board.tree ? view(p, a) : '', /one tile/);
  assert.equal(nextHint(p, a).text, 'Tiles 1 to 5 can shrink to one tile. Choose tiles 9 to 13.');
});

test('That’s all needs something kept', () => {
  const p = byId('01'), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null);
  assert.match(view(p, a), /class="sk-button sk-all"[^>]*disabled/);
  assert.equal(validBoard(p, {...a.board, refused: true}), false);
});

test('saves are checked, including a forged finish', () => {
  const p = byId('01'), fresh = freshAttempt(p);
  assert.equal(validBoard(p, {...fresh.board, done: true}), false);
  assert.equal(validBoard(p, {...fresh.board, shelf: [[0, 0]]}), true, 'a saved shelf is judged by That’s all, not by the save');
  assert.equal(validBoard(p, {...fresh.board, shelf: [[2, 0]], told: 'more', refused: true}), false, 'the wrong note');
  const q = byId('02');
  assert.equal(validBoard(q, {sel: [0, 4], tree: {s: 0, t: [true, false], k: [{s: null, t: [false, false], k: [null, null]}, {s: null, t: [false, false], k: [null, null]}]}}), false, 'a row shrunk on an untried way');
  assert.equal(validBoard(q, {sel: [0, 9], tree: leaf()}), false, 'too many tiles');
  assert.equal(validBoard(byId('03'), {...freshAttempt(byId('03')).board, flip: 9}), false);
});

test('the family has its own symbol and How to play opens with the mathematics', () => {
  const symbols = FAMILIES.filter(m => m.family).map(m => m.family.symbol);
  assert.equal(symbols.filter(s => s === '⇊').length, 1, 'a unique symbol');
  for (const p of shrink.puzzles) assert.match(p.controls, /^A row grows by turning every A into AB and every B into BA/, p.id);
});

test('every puzzle renders a board, short copy and no nested buttons', () => {
  for (const p of shrink.puzzles) {
    const a = freshAttempt(p);
    const html = view(p, a);
    const b = board(html);
    let depth = 0, nested = false;
    for (const m of b.matchAll(/<(\/?)button\b/g)) { depth += m[1] ? -1 : 1; if (depth > 1) nested = true; }
    assert.equal(nested, false, `${p.id}: no button inside a button`);
    assert.doesNotMatch(b, /sk-told/, `${p.id}: no message on a fresh board`);
    assert.doesNotMatch(b, new RegExp(p.title), `${p.id}: no title on the board`);
    assert.ok(p.visibleObjective.length < 150, `${p.id}: a short objective`);
  }
  const g = shrink.puzzles.find(p => p.parameters.mode === 'playground');
  let a = freshAttempt(g);
  for (let i = 1; i < g.parameters.rows; i++) a = play(g, a, {type: 'grow'});
  const html = view(g, a);
  assert.match(html, /aria-label="ABBABAABBAABABBA"/, 'five rows');
  assert.match(html, /sk-grow"[^>]*disabled/, 'Grow stops at five rows');
  a = play(g, a, {type: 'start'});
  assert.match(view(g, a), /aria-label="BAABABBAABBABAAB"/);
});

test('seam buttons cover the row: each join takes the taps nearest to it', () => {
  const p = byId('02');
  const a = play(p, freshAttempt(p), {type: 'select', a: 0, b: 4});
  const html = view(p, a);
  const gaps = [...html.matchAll(/class="sk-gap[^"]*" style="left:([\d.]+)%;width:([\d.]+)%/g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(gaps.length, 6, 'five tiles have six joins, the ends included');
  assert.equal(gaps[0][0], 0, 'the first join reaches the left edge');
  assert.ok(Math.abs(gaps.at(-1)[0] + gaps.at(-1)[1] - 100) < 0.01, 'the last reaches the right edge');
  for (let i = 1; i < gaps.length; i++) assert.ok(Math.abs(gaps[i][0] - (gaps[i - 1][0] + gaps[i - 1][1])) < 0.01, 'no gaps and no overlaps');
});

test('once a row has seams, the other way takes a slot and a half at each of its joins, and the seams only a quarter slot each side', () => {
  const p = byId('02');
  const a = play(p, freshAttempt(p), {type: 'select', a: 0, b: 4}, {type: 'seam', at: '', s: 0});
  const html = view(p, a);
  const gaps = [...html.matchAll(/class="sk-gap([^"]*)" style="left:([\d.]+)%;width:([\d.]+)%/g)].map(m => ({on: m[1].includes('on'), from: Number(m[2]) * 7 / 100, width: Number(m[3]) * 7 / 100}));
  assert.equal(gaps.length, 6);
  const near = (x, y) => Math.abs(x - y) < 0.01;
  // Seven slots: ghost, five tiles, ghost. Joins 0, 2 and 4 carry seams.
  assert.deepEqual(gaps.map(g => g.on), [true, false, true, false, true, false]);
  assert.ok(near(gaps[0].width, 1.25) && near(gaps[2].width, 0.5) && near(gaps[4].width, 0.5), 'a seam keeps a quarter slot each side (the end one reaches the edge)');
  assert.ok(near(gaps[1].width, 1.5) && near(gaps[3].width, 1.5) && near(gaps[5].width, 1.75), 'the other way takes the rest');
  for (let i = 1; i < gaps.length; i++) assert.ok(near(gaps[i].from, gaps[i - 1].from + gaps[i - 1].width), 'no gaps and no overlaps');
  assert.match(html, /class="sk-row[^"]*" style="--n:7"/);
});

test('an untouched row shows its joins; marks of the way not drawn are dimmed', () => {
  const p = byId('04');
  let a = freshAttempt(p);
  assert.match(view(p, a), /class="sk-row fresh"/, 'a fresh row');
  // ABBAABBA: with the first tile alone it marks BB, AA and BB; paired it marks nothing.
  a = play(p, a, {type: 'seam', piece: 2, at: '', s: 1});
  let html = view(p, a);
  assert.doesNotMatch(html, /sk-row[^"]*fresh/, 'seams placed');
  assert.equal((html.match(/class="sk-mark over"/g) || []).length, 3);
  a = play(p, a, {type: 'seam', piece: 2, at: '', s: 0});
  html = view(p, a);
  assert.equal((html.match(/class="sk-mark over other"/g) || []).length, 3, 'the marks stay, dimmed, when the other way is drawn');
});

test('the strip runs at most eight tiles to a line', () => {
  for (const p of shrink.puzzles.filter(x => x.parameters.mode === 'impostor')) {
    const html = view(p, freshAttempt(p));
    const lines = [...html.matchAll(/<div class="sk-line[^"]*" style="--c:(\d+)">/g)].map(m => Number(m[1]));
    assert.ok(lines.length && lines.every(c => c <= 8), `${p.id}: ${lines}`);
    assert.equal(lines.reduce((x, y) => x + y, 0) >= p.parameters.strip.length, true);
  }
});

test('opened again, an every-way puzzle shows the piece of the last move', () => {
  const p = byId('01');
  let a = play(p, freshAttempt(p), {type: 'seam', piece: 2, at: '', s: 1});
  assert.match(view(p, a), /aria-label="Shrinking"[\s\S]*aria-label="AABB, first tile alone"/, 'the tree that changed last');
  a = play(p, a, ...oneTile('BAABA', 0, {piece: 1}), {type: 'keep', piece: 1});
  assert.match(view(p, a), /aria-label="Shrinking"[\s\S]*aria-label="BAABA, paired from the first tile"/, 'after a Keep, its piece');
  assert.match(view(p, freshAttempt(p)), /aria-label="Shrinking"[\s\S]*aria-label="ABA"/, 'with no move, the first piece');
});
