// Boot: manifests → plate → stage → doors/labels/hud → panel/path/walk → router.
import { loadContent, getManifest, getGeometry, getParams, str, reducedMotion } from './content.js?v=2026-09-10f';
import { layout, rest, place, buildPicture, setLayer, getState, setResizeHandler, warmRoom, showRoom, hideRoom, whenRoomHidden, panRoom } from './stage.js?v=2026-09-10f';
import { buildDoors, setCurrent, hideDoors, showDoors, doorElement, pathElement, firstDoorElement } from './hotspots.js?v=2026-09-10f';
import { buildLabels, headingElement } from './labels.js?v=2026-09-10f';
import { buildHud, rowElement, walkButton } from './hud.js?v=2026-09-10f';
import { parse, go, back, onRoute, currentRoute } from './router.js?v=2026-09-10f';
import { initDebug } from './debug.js?v=2026-09-10f';
import { openDoorPanel, openPathPanel, closePanel, panelHeading, setPanelStation, showStationChips } from './panel.js?v=2026-09-10f';
import { pushLayer, popLayer, resetLayers, setOpener } from './focus.js?v=2026-09-10f';
import { lightStage, clearArcs, buildArcs } from './path.js?v=2026-09-10f';
import { initKiosk, placeKiosk } from './kiosk.js?v=2026-09-10f';
import { initWalk, startWalk, endWalk, isWalking, walkStep } from './walk.js?v=2026-09-10f';
import { initRooms, roomFor, showRoomPins, clearRoomPins, probeFormats } from './rooms.js?v=2026-09-10f';

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
  initWalk({ go, onEnd: () => back() });   // the walk pushed one entry; popping it lands on the lobby
  rest(false);

  const roomsOn = params.get('rooms') !== '0';

  // The first paint: rest transform is already applied; fade the plate up once decoded.
  await decoded;
  await formats;
  await document.fonts.ready;   // the heading is set in Sora; revealing it before the swap would shift layout
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
    // Wait for the plate to settle only when it actually travels: a boot at rest or a reduced-motion
    // close has nothing to wait for and would leave the doors hidden for the fallback timer.
    if (!revealed) { revealed = true; scheduleDoorReveal({ settle: !!leaving && animate && !reducedMotion() }); }
    else if (leaving) { hideDoors(); scheduleDoorReveal({ settle: animate && !reducedMotion() }); }
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
      const sameDoor = !!(openDoor && openDoor !== 'path' && openDoor.id === d.id);
      const switching = !!(openDoor && openDoor !== 'path' && openDoor.id !== d.id);   // door-to-door tab switch: same layer
      const fromPath = openDoor === 'path';
      openDoor = d; revealed = true;
      clearArcs();
      hideDoors();
      setCurrent(d.id);
      setLayer(true, d.dock);
      const tgt = doorTarget(d);
      place({ ...tgt, z: g.layout.dolly.zoom, animate });
      const room = roomsOn ? roomFor(d) : null;
      const onStation = (s) => go({ view: 'door', id: d.id, station: s });
      // A resize on the open door only re-aims the camera and refits the room; the panel keeps its
      // scroll position and focus. A station change on the open door keeps the room where it is.
      const sameRender = sameDoor && getState().inRoom && room && document.getElementById('room-img').getAttribute('src') === room.render;
      if (!(resize && sameDoor)) openDoorPanel(d, { station: st.station, sameDoor: sameDoor || switching, onBack: () => back(), onTab: (id) => go({ view: 'door', id }), onStation });
      if (room && room.render && !(sameRender && !resize)) {
        showRoom(room.render, room.focus, { animate: animate && !sameRender, delay: animate && !sameRender ? 400 : 0 }).then((ok) => { if (ok && openDoor === d) { showRoomPins(d, room, onStation); showStationChips(d, room.stations ? Object.keys(room.stations) : null, onStation); } });
      } else if (!room || !room.render) { hideRoom(animate); clearRoomPins(); }
      else if (sameRender) { panRoom(room.focus, 900); }
      const stationEl = () => (st.station && document.getElementById(`st-${st.station}`)) || panelHeading();
      if (!sameDoor && !switching) pushLayer({ id: 'door', opener: getState().composed ? rowElement(d.id) : doorElement(d.id), first: stationEl, onEscape: () => back() });
      else if (switching || fromPath) setOpener(getState().composed ? rowElement(d.id) : doorElement(d.id));
      // Scroll the station into the panel after the layer's own focus call (both run at timeout 0, in order).
      if (st.station) setTimeout(() => setPanelStation(st.station, { room, animate: animate && (sameDoor || switching) }), 0);
      document.title = `${d.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'path') {
      const wasPath = openDoor === 'path';
      const fromDoor = !!(openDoor && openDoor !== 'path');
      openDoor = 'path'; revealed = true;
      clearRoomPins();
      hideRoom(animate);
      hideDoors();
      setCurrent('path');
      setLayer(true, 'left');
      place({ fx: g.tower[0], fy: g.tower[1] + 120, z: g.layout.dolly.zoom, animate });
      if (!(resize && wasPath)) openPathPanel({ stage: st.stage, samePanel: wasPath, onBack: () => back(), onDoor: (id) => go({ view: 'door', id }), onStage: (s) => go({ view: 'path', stage: s }) });
      lightStage(st.stage);
      if (!wasPath && !fromDoor) pushLayer({ id: 'path', opener: getState().composed ? rowElement('path') : pathElement(), first: () => panelHeading(), onEscape: () => back() });
      else if (fromDoor) setOpener(getState().composed ? rowElement('path') : pathElement());
      document.title = `${m.path.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'walk') { revealed = true; walkStep(st.step, { animate, resize }); return; }
  }

  onRoute((st, opts) => route(st, opts));

  // Warm every wired room one at a time once the lobby is on screen and idle.
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 500));
  idle(async () => { for (const d of m.doors) { const r = roomFor(d); if (r?.render) await warmRoom(r.render); } });

  // Escape unwinds one layer; focus.js handles it in the capture phase. Nothing else here.
}

main().catch((err) => { console.error(err); document.getElementById('boot').textContent = 'Could not load the lobby.'; });
