// Boot: manifests → plate → stage → doors/labels/hud → panel/path/walk → router.
import { loadContent, getManifest, getGeometry, getParams, str, reducedMotion } from './content.js?v=2026-09-10f';
import { layout, rest, place, buildPicture, setLayer, getState, setResizeHandler, warmRoom, showRoom, hideRoom, whenRoomHidden, panRoom, roomToScreen, frameRect, bandOffset } from './stage.js?v=2026-09-10f';
import { buildDoors, setCurrent, hideDoors, showDoors, doorElement, pathElement, firstDoorElement } from './hotspots.js?v=2026-09-10f';
import { buildLabels, headingElement } from './labels.js?v=2026-09-10f';
import { buildHud, rowElement, walkButton } from './hud.js?v=2026-09-10f';
import { parse, go, back, onRoute, currentRoute } from './router.js?v=2026-09-10f';
import { initDebug } from './debug.js?v=2026-09-10f';
import { openDoorPanel, openPathPanel, closePanel, panelHeading, setPanelStation, showStationChips } from './panel.js?v=2026-09-10f';
import { pushLayer, popLayer, resetLayers, setOpener } from './focus.js?v=2026-09-10f';
import { lightStage, clearArcs, buildArcs } from './path.js?v=2026-09-10f';
import { initKiosk, placeKiosk, kioskCentroid, kioskVisibleAt } from './kiosk.js?v=2026-09-10f';
import { initWalk, startWalk, endWalk, isWalking, walkStep } from './walk.js?v=2026-09-10f';
import { initRooms, roomFor, showRoomPins, clearRoomPins, setActivePin, probeFormats } from './rooms.js?v=2026-09-10f';
import { initTour, startTour, tourRoute, endTour, isTouring } from './tour.js?v=2026-09-10f';

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
  const roomsOn = params.get('rooms') !== '0';
  // O11: the walk button hands over to the guided tour once tour.gate is "approved"; ?tour=1
  // previews it before then and ?tour=0 always keeps the silent walk. With the tour off nothing
  // fetches content/tour.json and a #/tour link opens the lobby.
  const tourParam = params.get('tour');
  const tourOn = tourParam !== '0' && (tourParam === '1' || m.tour?.gate === 'approved');
  layout();
  const decoded = buildPicture(m.plate);
  buildDoors((d) => go({ view: 'door', id: d.id }), () => go({ view: 'path' }));
  buildLabels();
  buildArcs();
  buildHud({ onDoor: (d) => go({ view: 'door', id: d.id }), onPath: () => go({ view: 'path' }), onWalk: () => (tourOn ? startTour() : startWalk()) });
  initDebug();
  initKiosk();
  initRooms();
  const formats = probeFormats();
  initWalk({ go, onEnd: () => back() });   // the walk pushed one entry; popping it lands on the lobby
  rest(false);

  // The first paint: rest transform is already applied; fade the plate up once decoded.
  await decoded;
  await formats;
  await document.fonts.ready;   // the heading is set in Sora; revealing it before the swap would shift layout
  document.documentElement.classList.add('is-ready');
  document.documentElement.dataset.plateReady = '1';
  document.getElementById('boot').setAttribute('aria-hidden', 'true');

  setResizeHandler(() => route(currentRoute(), { resize: true }));

  let lastKey = null;
  let openDoor = null;     // the door whose scene is up, 'path', or null at rest (and at the kiosk)
  let revealed = false;
  let adopt = false;       // set by scene.handoff(): the next door/path route adopts the scene already up
  let sceneToken = 0;      // bumped by every scene change so a late follow-up (a station cue) can tell it is stale

  function doorTarget(d) {
    const geo = g.doorways[d.id];
    return { fx: geo.center[0], fy: geo.center[1] };
  }
  const roomOf = (d) => (roomsOn ? roomFor(d) : null);

  // ---- Scene helpers: what each view does to the lobby (camera, room, doors, arcs, panel). The
  // routes below add their own layer, focus and title; the `scene` object further down lets a
  // tour drive the same moves under its own layer. ----

  // The lobby at rest. The route closes every layer; `layer: true` keeps one open with no panel
  // (a tour at rest: doors on screen but inert under it).
  function restScene(animate, { layer = false } = {}) {
    sceneToken++;
    const leaving = openDoor || getState().inRoom;
    openDoor = null;
    clearRoomPins();
    hideRoom(animate);
    closePanel();
    if (layer) setLayer(true, 'none');
    else { resetLayers(); setLayer(false); }
    clearArcs();
    setCurrent(null);
    rest(animate);
    placeKiosk();
    // Wait for the plate to settle only when it actually travels: a boot at rest or a reduced-motion
    // close has nothing to wait for and would leave the doors hidden for the fallback timer.
    if (!revealed) { revealed = true; scheduleDoorReveal({ settle: !!leaving && animate && !reducedMotion() }); }
    else if (leaving) { hideDoors(); scheduleDoorReveal({ settle: animate && !reducedMotion() }); }
    else showDoors();
  }

  function toRest(animate) {
    restScene(animate);
    document.title = m.site.title;
  }

  // A door: dolly to its doorway, bring its room up with station pins, and open its panel. With
  // `panel: false` no panel opens and nothing docks, so the frame keeps the full width. `adopt`
  // takes over a room that is already up (a tour handing over): the panel renders fresh and the
  // pins and chips re-bind to this caller's onStation instead of the room fading in again.
  function doorScene(d, { station = null, animate = true, resize = false, panel = true, adopt: adopting = false, onBack, onTab, onStation }) {
    sceneToken++;
    const sameDoor = !!(openDoor && openDoor !== 'path' && openDoor.id === d.id);
    const switching = !!(openDoor && openDoor !== 'path' && openDoor.id !== d.id);   // door-to-door tab switch: same layer
    openDoor = d; revealed = true;
    clearArcs();
    hideDoors();
    setCurrent(d.id);
    setLayer(true, panel ? d.dock : 'none');
    const tgt = doorTarget(d);
    place({ ...tgt, z: g.layout.dolly.zoom, animate });
    const room = roomOf(d);
    const bind = () => { showRoomPins(d, room, onStation); showStationChips(d, room.stations ? Object.keys(room.stations) : null, onStation); };
    // A resize on the open door only re-aims the camera and refits the room; the panel keeps its
    // scroll position and focus. A station change on the open door keeps the room where it is.
    const sameRender = sameDoor && getState().inRoom && room && document.getElementById('room-img').getAttribute('src') === room.render;
    if (!panel) closePanel();
    else if (!(resize && sameDoor)) openDoorPanel(d, { station, sameDoor: (sameDoor || switching) && !adopting, onBack, onTab, onStation });
    let shown = Promise.resolve(false);
    if (room && room.render && !(sameRender && !resize)) {
      shown = showRoom(room.render, room.focus, { animate: animate && !sameRender, delay: animate && !sameRender ? 400 : 0 }).then((ok) => { if (ok && openDoor === d) bind(); return ok; });
    } else if (!room || !room.render) { hideRoom(animate); clearRoomPins(); }
    else if (sameRender) { panRoom(room.focus, 900); if (adopting) bind(); shown = Promise.resolve(true); }
    return { room, sameDoor, switching, shown };
  }

  // A station inside the open door's room, as a narrator points at it: scroll its panel section
  // into view without taking focus (when a panel is open), mark its pin, and pan the room about a
  // third of the way from the room's focus toward the station so the pin sits inside the frame. A
  // low station under a bottom inset (the tour card) needs a longer pan: the pan grows until the
  // pin clears the frame's edges by the margin rooms.js uses to show a pin. Only the last panRoom()
  // in the loop is ever drawn; the earlier ones are overwritten before the next frame.
  const pinInFrame = ([x, y]) => {
    const f = getState().roomFit; if (!f) return true;
    const p = roomToScreen(x * f.Wr, y * f.Hr), R = frameRect(), o = bandOffset();
    return !!p && p.x >= R.x + o.x + 24 && p.x <= R.x + o.x + R.w - 24 && p.y >= R.y + o.y + 24 && p.y <= R.y + o.y + R.h - 24;
  };
  function stationScene(d, s, animate) {
    const room = roomOf(d);
    setPanelStation(s, { room, animate, focus: false });
    const at = room?.stations?.[s];
    if (at && openDoor === d) {
      for (const k of [0.35, 0.6, 0.85, 1]) {
        if (!panRoom({ x: room.focus.x + (at[0] - room.focus.x) * k, y: room.focus.y + (at[1] - room.focus.y) * k }, animate ? 900 : 0) || pinInFrame(at)) break;
      }
    }
    setActivePin(s);   // after the pan, so pin visibility is judged against the new fit
  }

  // The maturity path: dolly to the tower, light the stage, and open the path panel (docked
  // left) unless `panel` is false.
  function pathScene({ stage = null, animate = true, resize = false, panel = true, adopt: adopting = false, onBack, onDoor, onStage }) {
    sceneToken++;
    const wasPath = openDoor === 'path';
    const fromDoor = !!(openDoor && openDoor !== 'path');
    openDoor = 'path'; revealed = true;
    clearRoomPins();
    hideRoom(animate);
    hideDoors();
    setCurrent('path');
    setLayer(true, panel ? 'left' : 'none');
    place({ fx: g.tower[0], fy: g.tower[1] + 120, z: g.layout.dolly.zoom, animate });
    if (!panel) closePanel();
    else if (!(resize && wasPath)) openPathPanel({ stage, samePanel: wasPath && !adopting, onBack, onDoor, onStage });
    lightStage(stage);
    return { wasPath, fromDoor };
  }

  // The kiosk, framed the way the walk frames it: a dolly onto the screen when its lines stay
  // legible at dolly zoom; otherwise (composed, small screens, no kiosk) the lobby at rest.
  // Returns whether the kiosk is on screen. No route uses it; a tour does.
  function kioskScene(animate) {
    const z = g.layout.dolly.zoom;
    const k = !getState().composed && kioskVisibleAt(z) ? kioskCentroid() : null;
    if (!k) { restScene(animate, { layer: true }); return false; }
    sceneToken++;
    openDoor = null; revealed = true;
    clearRoomPins();
    hideRoom(animate);
    closePanel();
    setLayer(true, 'none');
    clearArcs();
    setCurrent(null);
    hideDoors();
    place({ fx: k.x, fy: k.y, z, animate });
    return true;
  }

  // Resolves once the camera has stopped: at once when it neither moved nor was still moving (or
  // without animation), otherwise when the dolly's transition ends (or its fallback timer fires).
  const camera = () => ({ transform: plateEl.style.transform, moving: plateEl.classList.contains('moving') });
  function settled(animate, before) {
    const moved = before.moving || plateEl.style.transform !== before.transform;
    return new Promise((res) => { if (animate && moved && !reducedMotion()) afterPlateSettles(res); else res(); });
  }

  // A door given as its manifest entry or its id, resolved to the manifest entry (or null).
  const doorOf = (d) => m.doors.find((x) => x.id === (typeof d === 'string' ? d : d?.id)) || null;

  // The scene API a tour drives. Each call re-aims the lobby and resolves once the plate has
  // settled (a door also waits for its room). The caller owns the layer, focus and title: these
  // never push or pop a layer, move focus or touch the URL. Only handoff() affects a route.
  const scene = {
    rest({ animate = true } = {}) {
      const before = camera();
      restScene(animate, { layer: true });
      return settled(animate, before);
    },
    door(door, { station = null, animate = true, resize = false, panel = false, onBack = () => back(), onTab = () => {}, onStation = () => {} } = {}) {
      const d = doorOf(door);
      if (!d) return Promise.resolve();
      cancelPendingReveal();
      const before = camera();
      const { shown } = doorScene(d, { station, animate, resize, panel, onBack, onTab, onStation });
      setActivePin(null);
      const token = sceneToken;
      return Promise.all([settled(animate, before), shown]).then(() => { if (station && token === sceneToken) stationScene(d, station, animate); });
    },
    station(door, s, { animate = true } = {}) {
      const d = doorOf(door);
      if (d && openDoor === d) stationScene(d, s, animate);
      return Promise.resolve();
    },
    path({ stage = null, animate = true, resize = false, panel = false, onBack = () => back(), onDoor = () => {}, onStage = () => {} } = {}) {
      cancelPendingReveal();
      const before = camera();
      pathScene({ stage, animate, resize, panel, onBack, onDoor, onStage });
      return settled(animate, before);
    },
    kiosk({ animate = true } = {}) {
      cancelPendingReveal();
      const before = camera();
      const shown = kioskScene(animate);
      const p = settled(animate, before).then(() => shown);
      p.shown = shown;   // known at once, so a caller can lay out the fallback without waiting for the camera
      return p;
    },
    keep: () => Promise.resolve(),
    // Call just before go() to a door or path: that route then opens its own layer and focuses its
    // heading (or station) like any open, over the room and camera already on screen.
    handoff() { adopt = true; },
  };

  function route(st, opts = {}) {
    const key = JSON.stringify(st);
    const resize = !!opts.resize;
    if (key === lastKey && !resize) return;
    lastKey = key;
    cancelPendingReveal();
    const animate = !opts.boot && !resize;
    let handoff = adopt; adopt = false;
    if (isWalking() && st.view !== 'walk') endWalk({ silent: true });
    // Leaving the tour by any route but its own (Back, a hand-edited hash): at rest the lobby's
    // resetLayers() returns focus to the walk button; any other route opens its own layer, so the
    // tour's goes without returning focus. A door or the path takes the tour's scene over as See the
    // details does (the tour already set openDoor, so without this it would neither push a layer
    // nor adopt the room).
    if (isTouring() && st.view !== 'tour') {
      endTour({ silent: true, drop: st.view !== 'experience' });
      if (st.view === 'door' || st.view === 'path') handoff = true;
    }

    if (st.view === 'experience') { toRest(animate); document.documentElement.removeAttribute('data-lobby-boot'); return; }

    if (st.view === 'door') {
      const d = m.doors.find((x) => x.id === st.id);
      if (!d) { go({ view: 'experience' }, { replace: true }); return; }
      const fromPath = openDoor === 'path';
      const onStation = (s) => go({ view: 'door', id: d.id, station: s });
      const { room, sameDoor, switching } = doorScene(d, { station: st.station, animate, resize, adopt: handoff, onBack: () => back(), onTab: (id) => go({ view: 'door', id }), onStation });
      const opener = () => (getState().composed ? rowElement(d.id) : doorElement(d.id));
      const stationEl = () => (st.station && document.getElementById(`st-${st.station}`)) || panelHeading();
      if (handoff || (!sameDoor && !switching)) pushLayer({ id: 'door', opener: opener(), first: stationEl, onEscape: () => back() });
      else if (switching || fromPath) setOpener(opener());
      // Scroll the station into the panel after the layer's own focus call (both run at timeout 0, in order).
      if (st.station) setTimeout(() => setPanelStation(st.station, { room, animate: animate && (sameDoor || switching) && !handoff }), 0);
      document.title = `${d.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'path') {
      const { wasPath, fromDoor } = pathScene({ stage: st.stage, animate, resize, adopt: handoff, onBack: () => back(), onDoor: (id) => go({ view: 'door', id }), onStage: (s) => go({ view: 'path', stage: s }) });
      const opener = () => (getState().composed ? rowElement('path') : pathElement());
      if (handoff || (!wasPath && !fromDoor)) pushLayer({ id: 'path', opener: opener(), first: () => panelHeading(), onEscape: () => back() });
      else if (fromDoor) setOpener(opener());
      document.title = `${m.path.title} · ${m.site.name}`;
      document.documentElement.removeAttribute('data-lobby-boot');
      return;
    }

    if (st.view === 'walk') { revealed = true; walkStep(st.step, { animate, resize }); return; }

    // The guided tour (O10/O11), a layer of its own. With the tour off (gate pending, ?tour=0) a
    // tour link opens the lobby instead and the script is never fetched.
    if (st.view === 'tour') {
      if (!tourOn) { go({ view: 'experience' }, { replace: true }); return; }
      tourRoute(st, { animate, resize, boot: !!opts.boot });
      return;
    }
  }

  if (tourOn) initTour({ scene });
  // With the tour off, a #/tour link is the lobby, as it was before the tour existed: the router
  // boots on #/experience (one lobbyBase entry) instead of placing the lobby beneath a tour entry
  // that route() would then only replace.
  else if (parse().view === 'tour') history.replaceState(history.state, '', '#/experience');
  onRoute((st, opts) => route(st, opts));

  // Warm every wired room one at a time once the lobby is on screen and idle.
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 500));
  idle(async () => { for (const d of m.doors) { const r = roomFor(d); if (r?.render) await warmRoom(r.render); } });

  // Escape unwinds one layer; focus.js handles it in the capture phase. Nothing else here.
}

main().catch((err) => { console.error(err); document.getElementById('boot').textContent = 'Could not load the lobby.'; });
