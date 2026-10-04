import { BANDS, CONTENT_VERSION, freshAttempt, validBoard, isSolved, clone } from './engine.js';
import { legacyNimBoard } from './deduction.js';
import { weighingSecret } from './measurement.js';
import { validateJourney, freshJourney, withCampaignPuzzles, resolvePuzzle, campaignAttemptReachable } from './road.js';
import { validateJourney as validateRoad3Journey } from './caravan-road3.js';
import { validateJourney as validateCaravanJourney } from './caravan-legacy.js';
import { validateJourney as validateRescueJourney, resolvePuzzle as resolveRescuePuzzle } from './caravan-rescue.js';
export const SAVE_KEY = 'small-math-adventure:saves:v1';
export const BACKUP_KEY = 'small-math-adventure:previous:v1';
export const emptyStore = () => ({ schemaVersion: 1, contentVersion: CONTENT_VERSION, activeProfileId: null, profiles: [] });
// Only these revision-1 definitions may migrate to the L-only revision 2.
const legacyGardens = {
  "tile-k1-04": {
    "id": "tile-k1-04",
    "mechanic": "tile",
    "revision": 1,
    "cols": 3,
    "rows": 2,
    "cells": [
      0,
      1,
      2,
      3
    ]
  },
  "tile-k1-08": {
    "id": "tile-k1-08",
    "mechanic": "tile",
    "revision": 1,
    "cols": 4,
    "rows": 2,
    "cells": [
      1,
      2,
      4,
      5,
      6,
      7
    ]
  },
  "tile-k1-12": {
    "id": "tile-k1-12",
    "mechanic": "tile",
    "revision": 1,
    "cols": 4,
    "rows": 3,
    "cells": [
      1,
      2,
      4,
      5,
      6,
      7,
      9,
      10
    ]
  },
  "tile-23-04": {
    "id": "tile-23-04",
    "mechanic": "tile",
    "revision": 1,
    "cols": 4,
    "rows": 4,
    "cells": [
      0,
      1,
      2,
      4,
      5,
      6,
      9,
      10,
      11,
      13,
      14,
      15
    ]
  },
  "tile-23-08": {
    "id": "tile-23-08",
    "mechanic": "tile",
    "revision": 1,
    "cols": 4,
    "rows": 4,
    "cells": [
      1,
      2,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      14
    ]
  },
  "tile-23-12": {
    "id": "tile-23-12",
    "mechanic": "tile",
    "revision": 1,
    "cols": 4,
    "rows": 4,
    "cells": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ]
  },
  "tile-45-04": {
    "id": "tile-45-04",
    "mechanic": "tile",
    "revision": 1,
    "cols": 6,
    "rows": 5,
    "cells": [
      0,
      1,
      6,
      7,
      8,
      9,
      13,
      14,
      15,
      16,
      20,
      21,
      22,
      23,
      28,
      29
    ]
  },
  "tile-45-08": {
    "id": "tile-45-08",
    "mechanic": "tile",
    "revision": 1,
    "cols": 6,
    "rows": 6,
    "cells": [
      2,
      3,
      7,
      8,
      9,
      10,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      25,
      26,
      27,
      28,
      32,
      33
    ]
  },
  "tile-45-12": {
    "id": "tile-45-12",
    "mechanic": "tile",
    "revision": 1,
    "cols": 6,
    "rows": 4,
    "cells": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23
    ]
  }
};
const savedDefinition = (p, a) => p?.revision === 2 && p.tileShape === 'l-tromino' && a?.revision === 1 && Object.hasOwn(legacyGardens,p.id) ? legacyGardens[p.id] : p;
const readableBoard = (p, board) => validBoard(p, board) || p.mechanic === 'nim' && legacyNimBoard(p, board);
function restoredAttempt(p, a) {
  const saved = {revision:a.revision,board:clone(a.board),history:clone(a.history),moves:a.moves,hintLevel:a.hintLevel,helpUsed:a.helpUsed,completed:a.completed,lastPlayed:a.lastPlayed};
  if (savedDefinition(p,a) !== p) {
    const fresh = freshAttempt(p);
    return {...saved,revision:p.revision,board:fresh.board,history:[],moves:0};
  }
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
  const allPuzzles = withCampaignPuzzles(puzzles);
  const byId = new Map(allPuzzles.map(p => [p.id,p]));
  const journeys = new Map();
  const ids = new Set();
  for (const profile of value.profiles) {
    if (!profile || typeof profile.id !== 'string' || profile.id.length > 100 || !profile.id || ids.has(profile.id) || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 24 || !Object.hasOwn(BANDS,profile.band) || !Number.isInteger(profile.avatar) || profile.avatar < 0 || profile.avatar > 5 || typeof profile.sound !== 'boolean' || !profile.attempts || Array.isArray(profile.attempts) || typeof profile.attempts !== 'object' || Object.keys(profile.attempts).length > allPuzzles.length) throw new Error('An explorer in this backup is not valid.');
    ids.add(profile.id);
    // Earlier stories stay readable as archives; the current road is version 4.
    let journey, caravanJourney, rescueJourney, roadJourney;
    if (Object.hasOwn(profile,'caravanJourney')) caravanJourney=validateCaravanJourney(profile.caravanJourney,profile,puzzles);
    if (Object.hasOwn(profile,'rescueJourney')) rescueJourney=validateRescueJourney(profile.rescueJourney,profile,puzzles);
    if (Object.hasOwn(profile,'roadJourney')) roadJourney=validateRoad3Journey(profile.roadJourney,profile,puzzles);
    if (Object.hasOwn(profile,'journey')) {
      const version=profile.journey?.version;
      if (version===1) {
        if (caravanJourney) throw new Error('This backup has two earlier journeys.');
        caravanJourney=validateCaravanJourney(profile.journey,profile,puzzles);
        journey=freshJourney();
      } else if (version===2) {
        if (rescueJourney) throw new Error('This backup has two earlier rescue journeys.');
        rescueJourney=validateRescueJourney(profile.journey,profile,puzzles);
        journey=freshJourney();
      } else if (version===3) {
        if (roadJourney) throw new Error('This backup has two earlier road journeys.');
        const old=validateRoad3Journey(profile.journey,profile,puzzles);
        // A road that was never played (no finished or opened encounters) holds nothing to archive.
        if (old.completed.length||Object.keys(old.bindings).length) roadJourney=old;
        journey=freshJourney();
      } else journey=validateJourney(profile.journey,profile,puzzles);
    }
    journeys.set(profile.id,{...(journey?{journey}:{}),...(caravanJourney?{caravanJourney}:{}),...(rescueJourney?{rescueJourney}:{}),...(roadJourney?{roadJourney}:{})});
    const effectiveProfile={...profile,journey};
    for (const [id,a] of Object.entries(profile.attempts)) {
      const base = byId.get(id);
      // Archived pump capability belongs to the original rescue, never the new road.
      const archived=base?.campaignVersion===2;
      const current = archived?resolveRescuePuzzle(base,{...profile,journey:rescueJourney}):resolvePuzzle(base,effectiveProfile);
      const p = savedDefinition(current,a);
      if (base?.campaignOnly) {
        const reached = base.campaignVersion===4 ? campaignAttemptReachable(effectiveProfile,base) : Object.values((archived?rescueJourney:roadJourney)?.bindings||{}).includes(id);
        if (!reached) throw new Error('A campaign puzzle has not been reached.');
      }
      if (!p || !a || a.revision !== (p.revision || 1) || !readableBoard(p,a.board) || !Array.isArray(a.history) || a.history.length > 120 || !Number.isSafeInteger(a.moves) || a.moves < 0 || !Number.isInteger(a.hintLevel) || a.hintLevel < 0 || a.hintLevel > 3 || typeof a.helpUsed !== 'boolean' || typeof a.completed !== 'boolean' || !Number.isFinite(a.lastPlayed) || a.lastPlayed < 0 || (isSolved(p,a.board) && !a.completed)) throw new Error(`Saved puzzle ${id} does not match this puzzle pack.`);
      if (a.history.length > Math.min(a.moves,120)) throw new Error(`Undo history for ${id} is not valid.`);
      for (const [i,h] of a.history.entries()) if (!h || !(p.mechanic==='nim'&&legacyNimBoard(p,a.board)?legacyNimBoard(p,h.board):validBoard(p,h.board)) || h.moves !== a.moves-a.history.length+i) throw new Error(`Undo history for ${id} is not valid.`);
      if (p.mechanic === 'weigh' && a.history.some(h => JSON.stringify(weighingSecret(p,h.board)) !== JSON.stringify(weighingSecret(p,a.board)))) throw new Error(`Undo history for ${id} changes the hidden pebble.`);
    }
  }
  if (value.activeProfileId !== null && !ids.has(value.activeProfileId)) throw new Error('The selected explorer is missing.');
  // Copy only documented fields; never merge arbitrary imported object keys.
  return { schemaVersion: 1, contentVersion: CONTENT_VERSION, activeProfileId: value.activeProfileId, profiles: value.profiles.map(p => ({ id:p.id,name:p.name,band:p.band,avatar:p.avatar,sound:p.sound,attempts:Object.fromEntries(Object.entries(p.attempts).map(([id,a]) => [id,restoredAttempt(byId.get(id),a)])),...journeys.get(p.id) })) };
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
