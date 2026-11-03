// Verifies every sprite row has the right width and only known colours.
const S = require('../renderer/sprites.js');

const frames = {};
for (const legs of ['A', 'B'])
  for (const eyes of ['open', 'closed', 'happy'])
    for (let tail = 0; tail < S.TAIL_POSES; tail++) frames[`legs${legs}-${eyes}-tail${tail}`] = S.build({ legs, eyes, tail });
frames.lying = S.build({ lying: true, eyes: 'closed' });

let errors = 0;
function check(name, rows, width, height) {
  if (height !== undefined && rows.length !== height) {
    console.error(`${name}: expected ${height} rows, got ${rows.length}`);
    errors++;
  }
  rows.forEach((r, i) => {
    if (r.length !== width) {
      console.error(`${name} row ${i}: expected width ${width}, got ${r.length}: "${r}"`);
      errors++;
    }
    for (const ch of r) {
      if (ch !== '.' && !(ch in S.PALETTE)) {
        console.error(`${name} row ${i}: unknown colour "${ch}"`);
        errors++;
      }
    }
  });
}

for (const [name, rows] of Object.entries(frames)) check(name, rows, S.WIDTH, S.HEIGHT);
for (const [name, rows] of Object.entries({ HEART: S.HEART, ZZZ: S.ZZZ, BOWL: S.BOWL, head: S.head() }))
  check(name, rows, rows[0].length);

for (const c of S.COLORS) {
  for (const key of Object.keys(S.PALETTE)) {
    if (!/^#[0-9a-f]{6}$/i.test(c.palette[key] || '')) {
      console.error(`colour "${c.id}": missing or bad value for "${key}"`);
      errors++;
    }
  }
}

if (errors) {
  console.error(`${errors} problem(s) found`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(frames).length} cat frames, 4 extra sprites, ${S.COLORS.length} colours`);
