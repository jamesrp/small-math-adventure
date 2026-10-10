// Art slots. Every picture in the road UI has a stable slot ID; the manifest in
// art/manifest.json says which slots have finished art. Missing slots fall back
// to the drawn placeholders in road-placeholders.js, so the game is complete
// with no art at all and each finished file replaces exactly one placeholder.
//
// A slot may have an image (also the video's poster), a looping video, and a
// `then` slot for one-shot clips: after a clip ends, the slot plays `then`.
// Rendering keeps live <video> elements across re-renders (see keepMedia), so
// a loop does not restart on every move.
export const ART_ROOT = './art/';
let manifest = { version: 1, assets: {} };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const escAttr = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function loadArt(fetcher = globalThis.fetch) {
  try {
    const response = await fetcher(`${ART_ROOT}manifest.json`);
    if (response.ok) setManifest(await response.json());
  } catch { /* Placeholders cover every slot. */ }
  return manifest;
}
export function setManifest(value) {
  manifest = value && typeof value === 'object' && value.assets && typeof value.assets === 'object' ? value : { version: 1, assets: {} };
}
// Only entries marked ready are used; a half-finished batch can sit in the
// manifest as "todo" without reaching the game.
export function asset(id) {
  const entry = manifest.assets[id];
  return entry && entry.status === 'ready' && (entry.image || entry.video || entry.audio) ? entry : null;
}
export const artUrl = path => path && !/^(https?:|data:|\.\/|\/)/.test(path) ? `${ART_ROOT}${path}` : path;

// HTML for one slot. `key` identifies the on-screen position (for example
// "scene" or "keeper"), so a re-render with the same file reuses the element.
// One-shot clips (loop: false) hand over to the `then` slot when they end: its
// video if it has one, otherwise its still. `nonce` makes a repeated one-shot
// (a second mistake in a row) play again instead of reusing the finished clip.
export function media(id, placeholder, { key = id, cls = '', alt = '', then = null, loop = true, nonce = '' } = {}) {
  const entry = asset(id), base = `class="art-slot ${cls}" data-art="${escAttr(id)}" data-art-key="${escAttr(key)}"`;
  if (!entry) return `<div ${base} data-art-src="placeholder:${escAttr(id)}" data-placeholder="true">${placeholder}</div>`;
  const image = artUrl(entry.image), video = artUrl(entry.video), nextEntry = then ? asset(then) : null;
  if (video && !reduced()) {
    const handover = !loop && nextEntry ? `data-then-video="${escAttr(artUrl(nextEntry.video) || '')}" data-then-image="${escAttr(artUrl(nextEntry.image) || '')}"` : '';
    return `<div ${base} data-art-src="${escAttr(video)}${nonce === '' ? '' : `#${escAttr(nonce)}`}"><video src="${escAttr(video)}" ${image ? `poster="${escAttr(image)}"` : ''} autoplay muted playsinline ${loop ? 'loop' : ''} preload="auto" aria-hidden="true" ${handover}></video></div>`;
  }
  // Reduced motion and image-only slots show the slot's own still (a keeper's
  // happy or oops face, a scene change's finished stage), or the `then` slot's
  // when it has none.
  const still = image || artUrl(nextEntry?.image);
  return `<div ${base} data-art-src="${escAttr(still)}"><img src="${escAttr(still)}" alt="${escAttr(alt)}" decoding="async" ${alt ? '' : 'aria-hidden="true"'}></div>`;
}

// Reuse live media nodes whose slot and file did not change, then wire clips
// that hand over when they end.
export function keepMedia(root, render) {
  const old = new Map([...root.querySelectorAll('[data-art-key]')].map(node => [node.dataset.artKey, node]));
  render();
  for (const slot of root.querySelectorAll('[data-art-key]')) {
    const previous = old.get(slot.dataset.artKey);
    if (previous && previous !== slot && previous.dataset.artSrc === slot.dataset.artSrc && !slot.dataset.placeholder) {
      previous.className = slot.className;
      slot.replaceWith(previous);
    }
  }
  for (const video of root.querySelectorAll('video[data-then-video],video[data-then-image]')) {
    if (video.dataset.wired) continue;
    video.dataset.wired = 'true';
    video.addEventListener('ended', () => {
      const next = video.dataset.thenVideo, still = video.dataset.thenImage;
      // The slot keeps the clip's data-art-src so later renders still match it.
      if (next) { if (still) video.poster = still; video.loop = true; video.src = next; video.play?.().catch(() => {}); }
      else if (still) { const img = document.createElement('img'); img.src = still; img.alt = ''; img.setAttribute('aria-hidden', 'true'); video.replaceWith(img); }
    }, { once: true });
  }
  // Safari may refuse autoplay until the page has been touched; a stalled
  // video still shows its poster, which is a complete picture by design.
  // A finished one-shot stays finished.
  for (const video of root.querySelectorAll('video')) if (video.paused && !video.ended) video.play?.().catch(() => {});
}

// Slot IDs used by the road. The art roadmap lists the file each one expects.
export const slots = {
  map: layout => `map/${layout}`,
  scene: (stop, stage) => `scene/${stop}/${stage}`,
  sceneChange: (stop, stage) => `scene/${stop}/${stage - 1}-${stage}`,
  keeper: (id, pose) => `keeper/${id}/${pose}`,
  wagon: who => `map/wagon-${who}`,
  tool: id => `tool/${id}`,
  finale: () => 'finale/fair',
  party: id => `party/${id}`,
  stage: (stop, part) => `stage/${stop}/${part}`,
};
