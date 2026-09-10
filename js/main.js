// Boot: manifests → plate → stage → doors/labels/hud → panel/path/walk → router.
import { loadContent, getManifest, getGeometry, getParams, str } from './content.js?v=2026-09-10b';
import { layout, rest, place, buildPicture, setLayer, getState, setResizeHandler, warmRoom, showRoom, hideRoom, whenRoomHidden } from './stage.js?v=2026-09-10b';
import { buildDoors, setCurrent, hideDoors, showDoors, doorElement, pathElement, firstDoorElement } from './hotspots.js?v=2026-09-10b';
import { buildLabels, headingElement } from './labels.js?v=2026-09-10b';
import { buildHud, rowElement, walkButton } from './hud.js?v=2026-09-10b';
import { parse, go, back, onRoute, currentRoute } from './router.js?v=2026-09-10b';
import { initDebug } from './debug.js?v=2026-09-10b';
import { openDoorPanel, openPathPanel, closePanel, panelHeading, setPanelStation, showStationChips } from './panel.js?v=2026-09-10b';
import { pushLayer, popLayer, resetLayers } from './focus.js?v=2026-09-10b';
import { lightStage, clearArcs, buildArcs } from './path.js?v=2026-09-10b';
import { initKiosk, placeKiosk } from './kiosk.js?v=2026-09-10b';
import { initWalk, startWalk, endWalk, isWalking, walkStep } from './walk.js?v=2026-09-10b';
import { initRooms, roomFor, showRoomPins, clearRoomPins, probeFormats } from './rooms.js?v=2026-09-10b';

const plateEl = document.getElementById('plate');
const params = getParams();

// Run fn once the plate has finished travelling; a transition that never starts (same transform
// or reduced motion) fires no transitionend, so a timer backs it up.
function afterPlateSettles(fn, fallback) {
  const L = getGeometry().layout;
  const onEnd = (e) => { if (e.target === plateEl && e.propertyName === 'transform') run(); };
  const timer = setTimeout(run, fallback ?? L.dolly.ms + 100);
  const cleanup = () => { plateEl.removeEventListener('transitionend', onEnd); clearTimeout(timer); };
  function run() { cleanup(); fn(); }
  plateEl.addEventListener('transitionend', onEnd);
  return cleanup;
}
let cancelReveal = null;
function cancelPendingReveal() { if (cancelReveal) { cancelReveal(); cancelReveal = null; } }
function scheduleDoorReveal({ settle = true } = {}) {
  cancelPendingReveal();
  let dead = false, stopSettle = null, stopWait = null;
  const reveal = () => { stopWait = whenRoomHidden(() => { if (!dead) showDoors(); }); };
  if (!settle) reveal(); else stopSettle = afterPlateSettles(() => { if (!dead) reveal(); });
  cancelReveal = () => { dead = true; if (stopSettle) stopSettle(); if (stopWait) stopWait(); };
}

async function main() {
  const { manifest: m, geometry: g } = await loadContent();
  document.title = m.site.title;
  layout();
  const decoded = buildPicture(m.plate);
  buildDoors((d) => go({ view: 'door', id: d.id }), () => go({ view: 'path' }));
  buildLabels();
  buildArcs();
  buildHud({ onDoor: (d) => go({ view: 'door', id: d.id }), onPath: () => go({ view: 'path' }), onWalk: () => startWalk() });
  initDebug();
  initKiosk();
  initRooms();
  const formats = probeFormats();
  initWalk({ go, onEnd: () => go({ view: 'experience' }, { replace: true }) });
  rest(false);

  const roomsOn = params.get('rooms') !== '0';

  // The first paint: rest transform is already applied; fade the plate up once decoded.
  await decoded;
  await formats;
  document.documentElement.classList.add('is-ready');
  document.documentElement.dataset.plateReady = '1';
  document.getElementById('boot').setAttribute('aria-hidden', 'true');

  setResizeHandler(() => route(currentRoute(), { resize: true }));

  let lastKey = null;
  let openDoor = null;
  let revealed = false;

  function doorTarget(d) {
    const geo = g.doorways[d.id];
    return { fx: geo.center[0], fy: geo.center[1] };
  }

  function toRest(animate) {
    const leaving = openDoor || getState().inRoom;
    openDoor = null;
    clearRoomPins();
    hideRoom(animate);
    closePanel();
    resetLayers();
    setLayer(false);
    clearArcs();
    setCurrent(null);
    rest(animate);
    placeKiosk();
    if (!revealed) { revealed = true; scheduleDoorReveal({ settle: false }); }
    else if (leaving) { hideDoors(); scheduleDoorReveal(); }
    else showDoors();
    document.title = m.site.title;
  }

  function route(st, opts = {}) {
    const key = JSON.stringify(st);
    const resize = !!opts.resize;
    if (key === lastKey && !resize) return;
    lastKey = key;
    cancelPendingReveal();
    const animate = !opts.boot && !resize;
    if (isWalking() && st.view !== 'walk') endWalk({ silent: true });

    if (st.view === 'experience') { toRest(animate); document.documentElement.removeAttribute('data-lobby-boot'); return; }

    if (st.view === 'door') {
      const d = m.doors.find((x) => x.id === st.id);
      if (!d) { go({ view: 'experience' }, { replace: true }); return; }
      const sameDoor = openDoor && openDoor.id === d.id;
      openDoor = d;
      clearArcs();
      hideDoors();
      setCurrent(d.id);
      setLayer(true, d.dock);
      const tgt = doorTarget(d);
      place({ ...tgt, z: g.layout.dolly.zoom, animate });
      openDoorPanel(d, { station: st.station, sameDoor, onBack: () => back(), onTab: (id) => go({ view: 'door', id }), onStation: (s) => go({ view: 'door', id: d.id, station: s }) });
      const room = roomsOn ? roomFor(d) : null;
      if (room && room.render) {
        showRoom(room.render, room.focus, { animate, delay: animate ? 400 : 0 }).then((ok) => { if (ok && openDoor === d) showRoomPins(d, room, (s) => go({ view: 'door', id: d.id, station: s })); });
      } else { hideRoom(animate); clearRoomPins(); }
      if (st.station) setPanelStation(st.station, { room, animate });
      if (!sameDoor) pushLayer({ id: 'door', opener: getState().composed ? rowElement(d.id) : doorElement(d.id), first: () => panelHeading(), onEscape: () => back() });
      document.title = `${d.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'path') {
      const wasPath = openDoor === 'path';
      openDoor = 'path';
      clearRoomPins();
      hideRoom(animate);
      hideDoors();
      setCurrent('path');
      setLayer(true, 'left');
      place({ fx: g.tower[0], fy: g.tower[1] + 120, z: g.layout.dolly.zoom, animate });
      openPathPanel({ stage: st.stage, samePanel: wasPath, onBack: () => back(), onDoor: (id) => go({ view: 'door', id }), onStage: (s) => go({ view: 'path', stage: s }) });
      lightStage(st.stage);
      if (!wasPath) pushLayer({ id: 'path', opener: getState().composed ? rowElement('path') : pathElement(), first: () => panelHeading(), onEscape: () => back() });
      document.title = `${m.path.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'walk') { walkStep(st.step, { animate, resize }); return; }
  }

  onRoute((st, opts) => route(st, opts));

  // Warm every wired room one at a time once the lobby is on screen and idle.
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 500));
  idle(async () => { for (const d of m.doors) { const r = roomFor(d); if (r?.render) await warmRoom(r.render); } });

  // Escape unwinds one layer; focus.js handles it in the capture phase. Nothing else here.
}

main().catch((err) => { console.error(err); document.getElementById('boot').textContent = 'Could not load the lobby.'; });
