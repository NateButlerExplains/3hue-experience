// Layers, focus and Escape. A layer records who opened it and what should receive focus; closing
// returns focus to the opener. Escape is handled in the capture phase and closes only the
// innermost layer; at rest it is a no-op. There is no page-level focus trap: this is a page, not
// a modal, but everything under an open panel is inert so Tab never lands on a hidden control.
const stack = [];
const INERT = ['#doors', '#intro', '#hud-actions', '#floor-rows', '#floor-foot'];

function setInert(on) {
  for (const sel of INERT) { const el = document.querySelector(sel); if (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }
}

export function pushLayer({ id, opener, first, onEscape }) {
  stack.push({ id, opener: opener || document.activeElement, onEscape });
  setInert(true);
  setTimeout(() => { const el = typeof first === 'function' ? first() : first; if (el && document.contains(el)) el.focus({ preventScroll: true }); }, 0);
}

export function popLayer() {
  const top = stack.pop();
  if (!stack.length) setInert(false);
  if (top?.opener && document.contains(top.opener)) setTimeout(() => top.opener.focus({ preventScroll: true }), 0);
  return top;
}

export function resetLayers() {
  const top = stack[0];
  stack.length = 0;
  setInert(false);
  if (top?.opener && document.contains(top.opener)) setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) top.opener.focus({ preventScroll: true }); }, 0);
}

// Remove the innermost layer with this id without returning focus: whatever replaces it (a tour
// handing over to a door, which pushes its own layer) places focus itself. Returns the entry.
export function dropLayer(id) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].id !== id) continue;
    const [gone] = stack.splice(i, 1);
    if (!stack.length) setInert(false);
    return gone;
  }
  return null;
}

export function setOpener(el) { const top = stack[stack.length - 1]; if (top && el) top.opener = el; }
export function topLayer() { return stack[stack.length - 1] || null; }
export function depth() { return stack.length; }

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  // At rest Escape is a no-op for focus (P2b-D01); it only dismisses a door's hover/focus plate (WCAG 1.4.13).
  if (!top) { const a = document.activeElement; const d = a && a.closest && a.closest('#doors .door'); if (d) d.classList.add('plate-dismissed'); return; }
  e.preventDefault(); e.stopPropagation();
  if (top.onEscape) top.onEscape();
}, true);
