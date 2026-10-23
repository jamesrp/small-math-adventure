// Plays Who knows through the real interface: removing and putting back
// cards, a refused Next (a line only for cards never touched; a card taken off
// or put back since the last press marked, with its own answers drawn under
// the ones heard; Next waiting for a change; the line gone with the next move,
// Undo and Again included), That's all, a solve by keyboard, coaching dolls with the
// coached doll's headband hidden, a refused Show, Can't refused while cards
// still leave and accepted once the table stops changing, the design's
// refused answer, a missed goal and Again, the onlookers' reveal, Undo,
// Apply hint, the playground's set-up (the chosen count inert), and no page overflow.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// SHOTS=<dir> also saves tablet (1024 px) and phone (375 px) screenshots.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.wk-puzzle').waitFor(); };
const restart = async () => { if (await page.locator('[data-action=restart]:not([disabled])').count()) await page.locator('[data-action=restart]').click(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const card = w => page.locator(`.wk-table [data-focus="wk-card-${w}"]`);
const doll = k => page.locator(`.wk-who[data-focus="wk-who-${k}"]`);
const tap = async locator => { const b = await locator.boundingBox(); if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
const cards = async (...ws) => { for (const w of ws) await tap(card(w)); };
const button = name => page.getByRole('button', {name, exact: true});
const press = async name => tap(button(name).first());
const told = () => page.locator('.wk-told').innerText();
const noTold = async why => assert.equal(await page.locator('.wk-told').count(), 0, why);
// Marked cards by their letters, whether they are buttons or drawn only.
const LETTER = {yes: 'Y', no: 'N', blue: 'B', red: 'R'};
const marked = () => page.locator('.wk-card.marked').evaluateAll((es, L) => es.map(e => e.getAttribute('aria-label').split(', taken off')[0].split(', ').map(x => L[x]).join('')), LETTER);
// Choose a reply for each doll in turn: tap the doll, then its reply.
const coach = async (...replies) => { for (const [k, r] of replies.entries()) { await tap(doll(k)); await press(r); } };

try {
  await page.goto(base); await page.locator('#nickname').fill('Knowing QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-knowledge"] .family-ink-symbol').innerText(), '⊨');

  // Puzzle 1: a refused Next on untouched cards names none; a card taken off is
  // named with its own answer; Next waits for a change; the line goes with the
  // next move and Undo does not bring it back.
  await open('knowledge-01'); await fit('knowledge-01');
  assert.equal(await page.locator('.wk-question').innerText(), 'Does everyone want a cup?');
  assert.equal(await page.locator('button.wk-card').count(), 4);
  assert.equal(await page.locator('.wk-table .wk-yn').first().innerText(), 'Y', 'café cards show letters');
  await press('Next');
  assert.equal(await told(), 'A card on the table gives another answer.');
  assert.deepEqual(await marked(), [], 'no card touched, none marked');
  assert.equal(await page.locator('.wk-whatif').count(), 0);
  assert.ok(await button('Next').isDisabled(), 'Next waits for a change');
  assert.equal((await board('knowledge-01'))?.steps ?? 0, 0, 'a refused Next changes nothing');
  await tap(card('NY')); await noTold('the refusal went with the move');
  await page.locator('[data-action=undo]').click(); await noTold('Undo does not bring the refusal back');
  assert.equal(await button('Next').isEnabled(), true, 'Next is back after a change');
  await cards('NY', 'NN', 'YY');
  assert.equal(await card('YY').getAttribute('aria-pressed'), 'true');
  await press('Next');
  assert.equal(await told(), 'This card gives the same answer.');
  assert.deepEqual(await marked(), ['YY'], 'the card taken off since the last press is named');
  assert.equal(await page.locator('.wk-whatif-line .wk-chip.differ').count(), 0, 'its answer is the same');
  await tap(card('YY'));
  assert.equal(await card('YY').getAttribute('aria-pressed'), 'false', 'tapping again puts the card back');
  await press('Next');
  assert.equal(await page.locator('.wk-card.gone').count(), 2, 'the cards that left stay as gaps');
  assert.equal(await page.locator('.wk-slot.done .wk-tick').count(), 1);
  await tap(card('YN'));
  await press('That’s all'); await done();

  // Puzzle 2 by keyboard: focus stays on a card after each press.
  await open('knowledge-02'); await restart();
  for (const w of ['YY', 'YN']) { await card(w).focus(); await page.keyboard.press('Enter'); }
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('wk-card')), 'focus stays on a card button');
  await button('Next').focus(); await page.keyboard.press('Enter');
  assert.equal((await board('knowledge-02')).steps, 1);
  await button('That’s all').focus(); await page.keyboard.press('Enter');
  await done();

  // Puzzle 3: the announcement, then coaching with the headband hidden.
  await open('knowledge-03'); await fit('knowledge-03');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Keep going until every blue doll proves blue.');
  await press('Next');
  assert.equal(await told(), 'A card on the table has no blue.');
  assert.deepEqual(await marked(), []);
  await tap(card('RR')); await press('Next');
  assert.equal(await page.locator('button.wk-card').count(), 0, 'cards are only tapped between rounds');
  assert.equal(await page.locator('.wk-who.coached').getAttribute('aria-label'), 'Doll 1, headband hidden');
  assert.equal(await page.locator('.wk-who[aria-label="Doll 2, blue"]').count(), 1, 'doll 1 sees doll 2');
  assert.ok(await button('Show').isDisabled(), 'Show waits for every reply');
  await press('Prove blue');
  assert.equal(await page.locator('.wk-who.coached').getAttribute('aria-label'), 'Doll 2, headband hidden', 'a reply moves on to the next doll');
  await press('Not yet');
  await press('Show');
  assert.equal(await told(), 'Doll 1 could be red.');
  assert.deepEqual(await marked(), ['RB'], 'the card that fits what doll 1 sees, with doll 1 red');
  await tap(doll(0));
  assert.equal(await button('Prove blue').getAttribute('aria-pressed'), 'true');
  await press('Not yet'); await press('Show');
  assert.equal(await told(), 'Doll 2 can prove blue.');
  assert.deepEqual(await marked(), ['RB']);
  await tap(doll(1)); await press('Prove blue');
  // Undo takes back the reply.
  await page.locator('[data-action=undo]').click();
  assert.equal((await board('knowledge-03')).replies[1], 'notyet');
  await tap(doll(1)); await press('Prove blue'); await press('Show');
  await done();

  // Puzzle 8: Can't refused while cards still leave the table.
  await open('knowledge-08'); await restart(); await fit('knowledge-08');
  assert.equal(await page.locator('.wk-cant').count(), 0, 'no Can’t before the first round');
  await tap(card('RRR')); await press('Next');
  assert.ok(await button('Can’t').isDisabled(), 'Can’t waits for a round');
  await coach('Not yet', 'Not yet', 'Not yet'); await press('Show');
  assert.equal(await page.locator('.wk-label').filter({hasText: 'Round 1'}).count(), 1);
  await cards('BRR', 'RBR', 'RRB', 'BBR'); await press('Next');
  assert.equal(await told(), 'This card gives the same replies.');
  assert.deepEqual(await marked(), ['BBR']);
  assert.equal(await page.locator('.wk-label.wk-whatif').count(), 1, 'the marked card’s replies sit under round 1');
  await tap(card('BBR')); await press('Next');
  await press('Can’t');
  assert.equal(await told(), 'Cards left the table last round.');
  // Apply hint chooses the first reply.
  for (let k = 0; k < 3; k++) if (await button('Hint').isEnabled()) await button('Hint').click();
  await button('Apply hint').click();
  assert.equal((await board('knowledge-08')).replies[0], 'prove', 'the hint chose doll 1’s reply');

  // Puzzle 12: no announcement; the table never changes, so Can't.
  await open('knowledge-12'); await restart(); await fit('knowledge-12');
  assert.equal(await page.locator('.wk-announce').count(), 0);
  await coach('Not yet', 'Not yet', 'Not yet'); await press('Show');
  await tap(card('BBB')); await press('Next');
  assert.equal(await told(), 'This card gives the same replies.');
  await tap(card('BBB')); await press('Next');
  await press('Can’t'); await done();

  // Puzzle 9: an answer no deal gives, a missed goal and Again, then the goal.
  await open('knowledge-09'); await restart(); await fit('knowledge-09');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make answers that exactly two deals fit.');
  assert.ok(await button('Again').isDisabled());
  await press('Yes');
  assert.equal(await told(), 'No deal gives that answer.');
  await press('No'); await cards('YYY', 'YYN', 'YNY', 'YNN'); await press('Next');
  await press('Not yet');
  assert.equal(await told(), 'No deal gives that answer.', 'after a NO nobody says NOT YET');
  await press('No'); await press('Next'); await press('No'); await press('That’s all');
  assert.equal(await page.locator('.wk-puzzle.missed').count(), 1, 'four deals fit, not two');
  await press('Again');
  assert.deepEqual((await board('knowledge-09')).said, []);
  await noTold('Again does not bring back the first refusal');
  await press('Not yet'); await cards('NYY', 'NYN', 'NNY', 'NNN'); await press('Next');
  await press('No'); await cards('YYY', 'YYN'); await press('Next');
  await press('No'); await press('That’s all'); await done();

  // Puzzle 11: onlookers; the one deal left is revealed.
  await open('knowledge-11'); await restart(); await fit('knowledge-11');
  assert.equal(await page.locator('.wk-who[aria-label$="headband hidden"]').count(), 3);
  await tap(card('RRR')); await press('Next');
  await cards('BRR', 'RBR', 'RRB'); await press('Next');
  await cards('BBR', 'RBB'); await press('That’s all');
  assert.equal(await told(), 'A card on the table gives other replies.');
  assert.deepEqual(await marked(), [], 'BBB was never touched, so it is not named');
  await tap(card('BBB')); await press('That’s all'); await done();
  assert.equal(await page.locator('.wk-card.deal').count(), 1);
  assert.equal(await page.locator('.wk-who[aria-label="Doll 2, red"]').count(), 1, 'the headbands show once one card is left');

  // The playground: set-up until the first move.
  await open('knowledge-playground'); await fit('knowledge-playground');
  assert.equal(await button('Hint').count(), 0);
  await tap(page.getByRole('button', {name: '3 dolls'}));
  assert.equal(await page.getByText('That move is not allowed', {exact: false}).count(), 0, 'the chosen count does nothing');
  assert.equal((await board('knowledge-playground'))?.n ?? 3, 3);
  await tap(page.getByRole('button', {name: '4 dolls'}));
  assert.equal((await board('knowledge-playground')).deal, 'BBRR');
  await tap(page.getByRole('button', {name: 'Doll 3: red'}));
  assert.equal((await board('knowledge-playground')).deal, 'BBBR');
  await tap(page.locator('.wk-toggle'));
  assert.equal((await board('knowledge-playground')).least, 0);
  assert.equal(await page.locator('.wk-toggle').getAttribute('aria-pressed'), 'false');
  await tap(page.locator('.wk-toggle'));
  await fit('knowledge-playground, four dolls');
  await tap(card('RRRR'));
  assert.equal(await page.locator('.wk-setup').count(), 0, 'the set-up locks once play starts');
  await press('Next');
  assert.equal(await page.locator('.wk-who.coached').count(), 1);

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    const setups = {
      'knowledge-01': async () => { await press('Next'); },
      'knowledge-03': async () => { await tap(card('RR')); await press('Next'); await coach('Prove blue', 'Not yet'); await press('Show'); },
      'knowledge-08': async () => { await tap(card('RRR')); await press('Next'); await coach('Not yet', 'Not yet', 'Not yet'); await press('Show'); await press('Next'); },
      'knowledge-09': async () => { await press('Not yet'); await cards('NYY', 'NYN', 'NNY', 'NNN'); await press('Next'); },
      'knowledge-11': async () => { await tap(card('RRR')); await press('Next'); },
      'knowledge-13': async () => { await cards('RRRR', 'BRRR', 'RBRR', 'RRBR', 'RRRB'); await press('Next'); await tap(doll(2)); }
    };
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      await page.setViewportSize({width: w, height: h});
      for (const id of ['knowledge-01', 'knowledge-03', 'knowledge-05', 'knowledge-06', 'knowledge-08', 'knowledge-09', 'knowledge-11', 'knowledge-12', 'knowledge-13', 'knowledge-playground']) {
        await open(id); await restart();
        if (setups[id]) await setups[id]();
        await fit(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
