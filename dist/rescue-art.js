import {isSolved} from './engine.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pumpDrawing=(x=0,y=0,working=true)=>`<g transform="translate(${x} ${y})"><path d="M-20 18v-38h40v38z" fill="${working?'#dfb864':'#6e8180'}" stroke="#293f42" stroke-width="3"/><circle r="11" fill="#334e50"/><path d="M0-20v-15m-17 0h34M20 6h15v26m-55-21h-15v20" fill="none" stroke="${working?'#dfb864':'#6e8180'}" stroke-width="5" stroke-linecap="round"/>${working?'<path d="m-5 1 4 4 7-9" fill="none" stroke="#f4d78c" stroke-width="3"/>':'<path d="m-5-5 10 10m0-10L-5 5" stroke="#d9aa88" stroke-width="3"/>'}</g>`;

// Finished story illustrations. Puzzle controls remain the source of truth for
// quantities and legal moves; art changes when a story consequence is earned.
const descriptions={
  'citadel-night':'Five companions look toward the moonlit citadel. Fern and the lantern tree wait in a glowing tower window.',
  'harbor-boarding':'The companions gather with Fern and the lantern tree beside the harbor ferry.',
  'water-entry':'Luma guides the companions toward the citadel’s water gate in her boat.',
  'roof-entry':'Bracken anchors a rope while the companions prepare to cross the moonlit rooftops.',
  'workshop-door':'Bea, Pip and Tumble wait outside the locked workshop.',
  'pump-broken':'Bea works on a broken brass pump at the workshop bench.',
  'pump-ready':'Bea’s repaired pump runs beside the workshop’s water chamber.',
  'lift-sealed':'The companions inspect a still lift. The pump connection is empty.',
  'lift-powered':'Bea has connected her brass pump beside the tower lift.',
  'lift-rising':'The tower lift carries the companions upward toward Fern.',
  'fern-signal':'Fern lifts a shutter to signal to Pip and Rook across the moonlit gap.',
  'fern-door':'Pip and Bea wait outside the tower door while Fern reaches for its inner handle.',
  'reunion-alarm':'Fern rejoins her five friends with the lantern tree. An alarm glows above the open door.',
  'decoy-corridor':'The companions slip away with the tree while clockwork sentries follow the lights down another passage.',
  'escape-counterweight':'Bea and Fern prepare the last water counterweight while their friends wait with the tree.',
  'water-escape':'Luma rows all six companions and the lantern tree away from the citadel at dawn.',
  'cable-escape':'Bracken brings the basket carrying all six companions and the lantern tree safely toward the cliffs.',
  'dawn-home':'All six friends gather around their lantern tree, planted in a green valley at dawn.'
};
const sceneImage=(id,cls='')=>`<img class="${cls}" src="./assets/story/${id}.jpg" width="1774" height="887" alt="${esc(descriptions[id])}" decoding="async">`;
function beforeScene(effect,roof,pump){
  return ({capture:'harbor-boarding',sneak:'citadel-night',entry:roof?'roof-entry':'water-entry',workshop:'workshop-door',pump:'pump-broken',practice:'pump-ready',lift:pump?'lift-powered':'lift-sealed',contact:'fern-signal',rescue:'fern-door',decoy:'reunion-alarm',escape:'escape-counterweight'})[effect]||'citadel-night';
}
export function rescueLandscape(progress={}){
  const id=progress.complete?'dawn-home':beforeScene(progress.encounter?.effect,progress.route==='ridge',progress.pump);
  return sceneImage(id,'caravan-landscape rescue-landscape');
}
export function encounterScene(encounter,profile,puzzle,attempt){
  const solved=isSolved(puzzle,attempt.board),effect=encounter.effect,roof=profile.journey?.route==='ridge';
  const id=solved?({capture:'citadel-night',sneak:'citadel-night',entry:'lift-sealed',workshop:'pump-broken',pump:'pump-ready',practice:'lift-powered',lift:'lift-rising',contact:'fern-door',rescue:'reunion-alarm',decoy:'decoy-corridor',escape:roof?'cable-escape':'water-escape'})[effect]:beforeScene(effect,roof,!puzzle.missingAbility);
  return `<figure class="encounter-scene ${solved?'scene-solved':''}" data-effect="${esc(effect)}" data-solved="${solved}">${sceneImage(id)}${solved?'':`<figcaption class="story-caption"><p>${esc(encounter.intro)}</p><button type="button" class="text-button story-listen" data-action="hear-story" data-focus="story-listen" data-text="${esc(encounter.intro)}" aria-label="Listen to story"><span aria-hidden="true">▶</span> Listen</button></figcaption>`}<span class="sr-only" role="status">${solved?esc(descriptions[id]):''}</span></figure>`;
}
