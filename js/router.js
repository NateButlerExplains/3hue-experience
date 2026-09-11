// Hash router with layered history.
//   #/experience                       lobby at rest
//   #/door/<id>[/<station>]            a door (panel; room when wired)
//   #/path[/<stage>|/where-to-start]   the maturity path
//   #/walk/<n>                         the captioned walk, step n
//   #/tour[/<node>]                    the guided tour at a node of content/tour.json (O10/O11)
//
// go(state) is the only thing that touches the URL. Opening a layer pushes one entry; a change
// inside a layer (tab switch, next stage, next walk step, next tour node) replaces. Back therefore
// closes exactly one layer. A deep link in a fresh tab gets the lobby placed beneath it so Back
// lands on the lobby and not on whatever was before this site (O3: customer stack, no dashboard entry).
const LAYER = { experience: 0, door: 1, path: 1, walk: 1, tour: 1 };

export function parse(hash = location.hash) {
  const h = (hash || '#/experience').replace(/^#/, '');
  let m;
  if ((m = h.match(/^\/door\/([\w-]+)(?:\/([\w-]+))?/))) return { view: 'door', id: m[1], station: m[2] || null };
  if ((m = h.match(/^\/path(?:\/([\w-]+))?/))) return { view: 'path', stage: m[1] || null };
  if ((m = h.match(/^\/walk(?:\/(\d+))?/))) return { view: 'walk', step: m[1] ? +m[1] : 0 };
  if ((m = h.match(/^\/tour(?:\/([\w-]+))?/))) return { view: 'tour', node: m[1] || null };
  return { view: 'experience' };
}

export function hashFor(st) {
  if (st.view === 'door') return `#/door/${st.id}${st.station ? '/' + st.station : ''}`;
  if (st.view === 'path') return `#/path${st.stage ? '/' + st.stage : ''}`;
  if (st.view === 'walk') return `#/walk/${st.step || 0}`;
  if (st.view === 'tour') return `#/tour${st.node ? '/' + st.node : ''}`;
  return '#/experience';
}

let handler = null;
let current = parse();

function fire(st, opts) { current = st; if (handler) handler(st, opts); }

export function go(st, { replace = false } = {}) {
  const target = hashFor(st);
  const same = LAYER[st.view] === LAYER[current.view] && st.view === current.view;
  const rep = replace || (same && st.view !== 'experience');
  if (location.hash === target) { fire(st, { replace: true }); return; }
  if (rep) history.replaceState({ lobby: st }, '', target); else history.pushState({ lobby: st }, '', target);
  fire(st, { replace: rep });
}

// Close the innermost layer: one Back. If there is nothing beneath (fresh tab deep link handled
// by boot), fall back to the lobby.
export function back() {
  if (history.state && history.state.lobbyBase) { history.back(); return; }
  if (history.length > 1 && history.state && history.state.lobby) { history.back(); return; }
  go({ view: 'experience' }, { replace: true });
}

export function onRoute(fn) {
  handler = fn;
  // An entry created outside go() (the hash edited by hand, a fragment link) has no state; stamp
  // it so back() can still pop it.
  const stamp = (st) => { if (!history.state || !history.state.lobby) history.replaceState({ lobby: st }, '', hashFor(st)); };
  window.addEventListener('popstate', () => { const st = parse(); stamp(st); fire(st, { pop: true }); });
  window.addEventListener('hashchange', () => { const st = parse(); if (hashFor(st) !== hashFor(current)) { stamp(st); fire(st, { pop: true }); } });
  // Boot: a deep link gets the lobby placed beneath it.
  const first = parse();
  if (first.view !== 'experience') {
    history.replaceState({ lobby: { view: 'experience' }, lobbyBase: true }, '', '#/experience');
    history.pushState({ lobby: first }, '', hashFor(first));
  } else if (!history.state || !history.state.lobby) {
    history.replaceState({ lobby: first, lobbyBase: true }, '', hashFor(first));
  }
  fire(first, { boot: true });
}

export function currentRoute() { return current; }
