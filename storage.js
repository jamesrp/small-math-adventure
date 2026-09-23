import { BANDS, CONTENT_VERSION, freshAttempt, validBoard, isSolved, clone } from './engine.js';
import { legacyNimBoard } from './deduction.js';
import { weighingSecret } from './measurement.js';
import { validateJourney } from './caravan.js';
export const SAVE_KEY = 'small-math-adventure:saves:v1';
export const BACKUP_KEY = 'small-math-adventure:previous:v1';
export const emptyStore = () => ({ schemaVersion: 1, contentVersion: CONTENT_VERSION, activeProfileId: null, profiles: [] });
const readableBoard = (p, board) => validBoard(p, board) || p.mechanic === 'nim' && legacyNimBoard(p, board);
function restoredAttempt(p, a) {
  const saved = {revision:a.revision,board:clone(a.board),history:clone(a.history),moves:a.moves,hintLevel:a.hintLevel,helpUsed:a.helpUsed,completed:a.completed,lastPlayed:a.lastPlayed};
  // An old first-move answer is not an unfinished match. Start a new match,
  // preserving earned discoveries and assistance, after validating the old save.
  if (p.mechanic === 'nim' && legacyNimBoard(p, a.board)) {
    const fresh = freshAttempt(p);
    return {...saved,board:fresh.board,history:[],moves:0};
  }
  if (p.mechanic === 'weigh') {
    saved.board.secret = [...weighingSecret(p, saved.board)];
    for (const h of saved.history) h.board.secret = [...weighingSecret(p, h.board)];
  }
  return saved;
}
export function validateStore(value, puzzles) {
  if (!value || value.schemaVersion !== 1 || value.contentVersion !== CONTENT_VERSION || !Array.isArray(value.profiles) || value.profiles.length > 30) throw new Error('This backup has an unsupported version or too many explorers.');
  const byId = new Map(puzzles.map(p => [p.id,p]));
  const ids = new Set();
  for (const profile of value.profiles) {
    if (!profile || typeof profile.id !== 'string' || profile.id.length > 100 || !profile.id || ids.has(profile.id) || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 24 || !Object.hasOwn(BANDS,profile.band) || !Number.isInteger(profile.avatar) || profile.avatar < 0 || profile.avatar > 5 || typeof profile.sound !== 'boolean' || !profile.attempts || Array.isArray(profile.attempts) || typeof profile.attempts !== 'object' || Object.keys(profile.attempts).length > puzzles.length) throw new Error('An explorer in this backup is not valid.');
    ids.add(profile.id);
    for (const [id,a] of Object.entries(profile.attempts)) {
      const p = byId.get(id);
      if (!p || !a || a.revision !== (p.revision || 1) || !readableBoard(p,a.board) || !Array.isArray(a.history) || a.history.length > 120 || !Number.isSafeInteger(a.moves) || a.moves < 0 || !Number.isInteger(a.hintLevel) || a.hintLevel < 0 || a.hintLevel > 3 || typeof a.helpUsed !== 'boolean' || typeof a.completed !== 'boolean' || !Number.isFinite(a.lastPlayed) || a.lastPlayed < 0 || (isSolved(p,a.board) && !a.completed)) throw new Error(`Saved puzzle ${id} does not match this puzzle pack.`);
      if (a.history.length > Math.min(a.moves,120)) throw new Error(`Undo history for ${id} is not valid.`);
      for (const [i,h] of a.history.entries()) if (!h || !(p.mechanic==='nim'&&legacyNimBoard(p,a.board)?legacyNimBoard(p,h.board):validBoard(p,h.board)) || h.moves !== a.moves-a.history.length+i) throw new Error(`Undo history for ${id} is not valid.`);
      if (p.mechanic === 'weigh' && a.history.some(h => JSON.stringify(weighingSecret(p,h.board)) !== JSON.stringify(weighingSecret(p,a.board)))) throw new Error(`Undo history for ${id} changes the hidden pebble.`);
    }
  }
  if (value.activeProfileId !== null && !ids.has(value.activeProfileId)) throw new Error('The selected explorer is missing.');
  // Copy only documented fields; never merge arbitrary imported object keys.
  return { schemaVersion: 1, contentVersion: CONTENT_VERSION, activeProfileId: value.activeProfileId, profiles: value.profiles.map(p => ({ id:p.id,name:p.name,band:p.band,avatar:p.avatar,sound:p.sound,attempts:Object.fromEntries(Object.entries(p.attempts).map(([id,a]) => [id,restoredAttempt(byId.get(id),a)])),...(Object.hasOwn(p,'journey') ? {journey:validateJourney(p.journey,p,puzzles)} : {}) })) };
}
export function loadStore(storage, puzzles) {
  let primary;
  try { primary = storage.getItem(SAVE_KEY); } catch { return { store:emptyStore(), warning:'This browser is blocking saves. You can play, but export a backup before leaving.' }; }
  if (!primary) return { store:emptyStore(), warning:'' };
  try { return { store:validateStore(JSON.parse(primary),puzzles), warning:'' }; } catch {
    try { const previous = storage.getItem(BACKUP_KEY); if (previous) return { store:validateStore(JSON.parse(previous),puzzles), warning:'The latest save could not be read. Your previous good save was recovered. Export a backup now.' }; } catch { /* Preserve damaged data until an explicit change or clear. */ }
    return { store:emptyStore(), warning:'Saved data could not be read. The old save is still in browser storage. Import a backup or start a new explorer to continue.' };
  }
}
export function persistStore(storage, store, puzzles) {
  try {
    const serialized = JSON.stringify(validateStore(store,puzzles));
    const old = storage.getItem(SAVE_KEY);
    // Keep only a known-good previous snapshot, never overwrite it with corruption.
    if (old) { try { validateStore(JSON.parse(old),puzzles); storage.setItem(BACKUP_KEY,old); } catch { /* Current save still gets its own write attempt. */ } }
    storage.setItem(SAVE_KEY,serialized);
    return '';
  } catch { return 'Progress is only in memory: this device could not save it. Export a backup before closing the app.'; }
}
export function parseBackup(text, puzzles) {
  if (typeof text !== 'string' || text.length > 5000000) throw new Error('Choose a Small math adventure JSON backup smaller than 5 MB.');
  try { return validateStore(JSON.parse(text),puzzles); } catch (e) { if (e instanceof SyntaxError) throw new Error('This file is not a readable JSON backup.'); throw e; }
}
export function importProfiles(store, backup, makeId) {
  if (store.profiles.length + backup.profiles.length > 30) throw new Error('There is room for 30 saved explorers. Remove an unused save first.');
  const incoming = backup.profiles.map(p => ({...clone(p),id:makeId(),name:p.name.slice(0,24)}));
  return { ...store, profiles:[...store.profiles,...incoming], activeProfileId:store.activeProfileId || incoming[0]?.id || null };
}
