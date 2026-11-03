// Verifies every sprite row has the right width and only colours the pet's palettes define.
const S = require('../renderer/sprites.js');

let errors = 0;
function fail(msg) {
  console.error(msg);
  errors++;
}

function check(name, rows, width, height, keys) {
  if (height !== undefined && rows.length !== height) fail(`${name}: expected ${height} rows, got ${rows.length}`);
  rows.forEach((r, i) => {
    if (r.length !== width) fail(`${name} row ${i}: expected width ${width}, got ${r.length}: "${r}"`);
    for (const ch of r) if (ch !== '.' && !keys.includes(ch)) fail(`${name} row ${i}: unknown colour "${ch}"`);
  });
}

let frameCount = 0;
for (const pet of Object.values(S.species)) {
  const keys = Object.keys(pet.COLORS[0].palette);

  for (const c of pet.COLORS) {
    for (const key of keys) {
      if (!/^#[0-9a-f]{6}$/i.test(c.palette[key] || '')) fail(`${pet.id} colour "${c.id}": missing or bad value for "${key}"`);
    }
  }

  const frames = {};
  for (const legs of ['A', 'B'])
    for (const eyes of ['open', 'closed', 'happy'])
      for (let tail = 0; tail < pet.TAIL_POSES; tail++) frames[`legs${legs}-${eyes}-tail${tail}`] = pet.build({ legs, eyes, tail });
  for (let tail = 0; tail < pet.TAIL_POSES; tail++) frames[`lying-tail${tail}`] = pet.build({ lying: true, eyes: 'closed', tail });
  for (const [name, rows] of Object.entries(frames)) check(`${pet.id} ${name}`, rows, pet.WIDTH, pet.HEIGHT, keys);
  frameCount += Object.keys(frames).length;

  for (const [anim, a] of Object.entries(pet.tailAnims)) {
    for (const t of a.seq) if (t < 0 || t >= pet.TAIL_POSES) fail(`${pet.id} tail anim "${anim}": no tail pose ${t}`);
  }
  if (pet.head) check(`${pet.id} head`, pet.head(), pet.head()[0].length, undefined, keys);

  console.log(`${pet.id}: ${Object.keys(frames).length} frames, ${pet.COLORS.length} colours`);
}

const propKeys = Object.keys(S.PALETTE);
for (const [name, rows] of Object.entries({ HEART: S.HEART, ZZZ: S.ZZZ, BOWL: S.BOWL })) check(name, rows, rows[0].length, undefined, propKeys);

if (errors) {
  console.error(`${errors} problem(s) found`);
  process.exit(1);
}
console.log(`OK: ${frameCount} frames across ${Object.keys(S.species).length} pets`);
