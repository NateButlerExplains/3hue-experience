// Homography: map a w x h element onto four plate-pixel corners (TL, TR, BR, BL) with matrix3d.
// Ported verbatim from the AiVRIC experience (js/screens.js lines 80-225); the layer/registry
// code that lived around it is not needed here.

// Solve A·x = b for an n x n system by Gaussian elimination with partial pivoting.
// Returns null if the matrix is singular (a degenerate quad), never throws.
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]); // augmented
  // Scale reference for the singularity test, so the tolerance is relative, not absolute.
  let scale = 0;
  for (const row of M) for (const v of row) { if (!Number.isFinite(v)) return null; scale = Math.max(scale, Math.abs(v)); }
  if (scale === 0) return null;
  const eps = scale * 1e-12;

  for (let col = 0; col < n; col++) {
    // partial pivot: largest magnitude in this column at or below the diagonal
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < eps) return null; // singular
    if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t; }
    const p = M[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / p;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  // back substitution
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
    if (!Number.isFinite(x[r])) return null;
  }
  return x;
}

// Solve the 8 unknowns for src[4] -> dst[4]; both are [[x,y], …] in the same units.
export function solveProjective(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  return solveLinear(A, b); // [a,b,c,d,e,f,g,h] or null
}

// CSS rejects some exponent forms; emit plain decimals.
function num(v) {
  if (!Number.isFinite(v)) return '0';
  let s = v.toFixed(12);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/**
 * Build the CSS matrix3d that maps the rectangle (0,0)-(w,h) onto `quad`.
 * @param {number[][]} quad four [x, y] corners, clockwise from the top-left of the surface
 * @param {number} w  source rectangle width  (the element's untransformed width)
 * @param {number} h  source rectangle height
 * @returns {string|null} a matrix3d(...) value, or null if the quad cannot be mapped
 */
export function quadToMatrix3d(quad, w, h) {
  if (!(w > 0) || !(h > 0)) return null;
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const m = solveProjective(src, quad);
  if (!m) return null;
  const [a, b, c, d, e, f, g, hh] = m;

  // Sanity 1: every source corner must stay in front of the projection plane (w' > 0).
  // A negative w' means the quad folds through the camera and the browser renders garbage.
  for (const [u, v] of src) if (!(g * u + hh * v + 1 > 1e-9)) return null;

  // Sanity 2: round-trip the four corners through the solved matrix. This catches a
  // near-singular solve that Gaussian elimination let through with a huge condition number.
  const diag = Math.hypot(quad[2][0] - quad[0][0], quad[2][1] - quad[0][1]) || 1;
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i];
    const wp = g * u + hh * v + 1;
    const dx = (a * u + b * v + c) / wp - quad[i][0];
    const dy = (d * u + e * v + f) / wp - quad[i][1];
    if (Math.hypot(dx, dy) > diag * 1e-6 + 0.01) return null;
  }
  return `matrix3d(${num(a)},${num(d)},0,${num(g)},${num(b)},${num(e)},0,${num(hh)},0,0,1,0,${num(c)},${num(f)},0,1)`;
}

/* ------------------------------------------------------------------ *
 * 2. Quad validation — malformed input warns once and mounts nothing
 * ------------------------------------------------------------------ */

const warned = new Set();
function warnOnce(key, ...args) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[screens]', ...args);
}

// Accepts [[x,y] x4] or [{x,y} x4]; returns a clean [[x,y] x4] or null.
function normalizeQuad(quad) {
  if (!Array.isArray(quad) || quad.length !== 4) return null;
  const out = [];
  for (const p of quad) {
    let x, y;
    if (Array.isArray(p) && p.length >= 2) { x = +p[0]; y = +p[1]; }
    else if (p && typeof p === 'object') { x = +p.x; y = +p.y; }
    else return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push([x, y]);
  }
  return out;
}

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// A quad is usable when it is simple (not a bow-tie) and has real area, i.e. the four
// turns all go the same way. Corners must be given in order around the surface.
function quadProblem(q) {
  let pos = 0, neg = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4]);
    if (c > 0) pos++; else if (c < 0) neg++;
  }
  if (pos && neg) return 'the corners cross over themselves — give them in order around the surface (top-left, top-right, bottom-right, bottom-left).';
  const area = Math.abs(
    q[0][0] * q[1][1] - q[1][0] * q[0][1] +
    q[1][0] * q[2][1] - q[2][0] * q[1][1] +
    q[2][0] * q[3][1] - q[3][0] * q[2][1] +
    q[3][0] * q[0][1] - q[0][0] * q[3][1]
  ) / 2;
  if (!(area > 1)) return 'the quad is degenerate (no area) — are two corners the same point, or all four in a line?';
  return null;
}

// Average edge lengths, in image pixels: the natural pixel size for the source rectangle,
// so content is authored and rasterised at roughly the size it appears in the render.
export function quadSize(quad) {
  const q = normalizeQuad(quad);
  if (!q) return null;
  const d = (a, b) => Math.hypot(q[b][0] - q[a][0], q[b][1] - q[a][1]);
  return {
    width: Math.max(1, Math.round((d(0, 1) + d(3, 2)) / 2)),
    height: Math.max(1, Math.round((d(0, 3) + d(1, 2)) / 2)),
  };
}

