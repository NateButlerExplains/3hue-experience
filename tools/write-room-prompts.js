#!/usr/bin/env node
// Emit one paste-ready render prompt per door into tools/room-prompts/<door>.txt.
// Nate pastes each into GPT with media/plate/lobby-plate-1920.jpg attached as the reference image.
// The prompts are derived from the manifest so a renamed door or accent stays in sync.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/experience.json'), 'utf8'));
const OUT = path.join(ROOT, 'tools/room-prompts');
fs.mkdirSync(OUT, { recursive: true });

const ACCENT = { cyan: 'cyan', orange: 'orange', navy: 'steel-blue' };

const style = (quiet) => `Photorealistic architectural visualization, cinematic, eye-level camera, 35 mm lens, physically based lighting. An interior room opening off a modern two-storey executive lobby at night: dark charcoal walls, walnut door frames and panelling edged with warm-white LED coves, backlit frosted panels, polished pale stone floor with soft reflections, floor-to-ceiling glass to a night city skyline, dark foliage in planters, cool blue ambient with warm 3000 K practical light. Materials, palette and lighting match the attached reference image exactly, as if this room is directly behind one of its lit doorways. No people. Every display is flat, rectangular, seen straight on, dark and blank, with nothing standing in front of it. No curved, holographic or projected surfaces. Keep the ${quiet} third of the frame quiet and low in detail, so a text panel can sit over it. Landscape 16:9, the largest size available. Highly detailed.`;

const SCENES = {
  'win-trust': {
    scene: `SCENE: The assurance room. A long walnut table with closed binders and an empty document tray. On the far wall, a row of blank backlit frosted panels glowing cool cyan-white. A small desk to one side with one dark flat monitor. Glass to the skyline on the left. An empty display niche in the walnut panelling. A thin ${ACCENT.cyan} light line runs along the floor edge; nothing else in the room is cyan.`,
  },
  'gain-control': {
    scene: `SCENE: The oversight room. A dark boardroom table with eight chairs under a low warm pendant. On a side plinth, a tidy architectural model of small building blocks lit from below. One wide flat matte wall display, dark and blank, seen straight on. Tall amber backlit frosted panels between walnut fins. Glass on the left looking onto a mezzanine. A side console. A thin ${ACCENT.orange} light line runs along the floor edge; nothing else in the room is orange.`,
  },
  'stay-ready': {
    scene: `SCENE: The readiness operations room. A straight row of three flat rectangular dark monitors on a matte-black console, seen straight on, all switched off. A standing desk with a closed laptop. A wall clock face with tick marks and no numerals. A glass-fronted equipment rack with a soft steel-blue status glow inside. A steel resilience locker. Glass to the skyline on the right. A thin ${ACCENT.navy} light line runs along the floor edge.`,
  },
};

const CLOSE = 'No text, no lettering, no numerals, no signage, no logos, no user interface elements anywhere in the image.';

for (const d of m.doors) {
  const quiet = d.dock === 'left' ? 'left' : 'right';
  const s = SCENES[d.id];
  if (!s) throw new Error(`no scene for ${d.id}`);
  const body = [
    `# ${d.title} room render prompt (door ${d.number}, panel docks ${d.dock}; keep the ${quiet} third quiet)`,
    `# Attach media/plate/lobby-plate-1920.jpg as the reference image. Ask for the largest landscape output. Do not accept text or people.`,
    '',
    style(quiet),
    '',
    s.scene,
    '',
    CLOSE,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, `${d.id}.txt`), body);
  console.log(`wrote tools/room-prompts/${d.id}.txt`);
}
