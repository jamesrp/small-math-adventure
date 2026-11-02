// The click a handled press leaves behind. A board that acts on a press
// itself, between pointerdown and pointerup, calls pressHandled() from the
// pointerup it took. The browser still sends that press a click. On a
// touchscreen the click is aimed after the board has redrawn, so it lands
// on whatever is drawn under the finger now: the tile just placed (which it
// would lift), the square just chosen (which it would let go), or a button
// that moved there. That one click is dropped here, before any other
// listener sees it. The next press or key ends the wait, and so does a
// second, so a click that never comes (a mouse press whose target was
// redrawn gets none) can't drop a later one; Enter and Space always click,
// and so does a script.
let pending = 0;
export function pressHandled() { pending = performance.now(); }
if (typeof window !== 'undefined') {
  const end = () => { pending = 0; };
  window.addEventListener('pointerdown', end, true);
  window.addEventListener('keydown', end, true);
  window.addEventListener('click', event => {
    if (!pending || !event.isTrusted) return;
    const echo = performance.now() - pending < 1000;
    pending = 0;
    if (echo) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
}
