// Pixel-art sprites for the desktop cat.
// Each sprite is an array of equal-length strings; one character = one pixel.
// '.' is transparent, every other character is a key into PALETTE.
// Works in the browser (window.CatSprites) and in Node (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatSprites = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Colour keys used in the sprites:
  //   k outline, o fur, d stripes, w belly / muzzle / paws, p ears / nose / blush, e eyes
  const COLORS = [
    { id: 'orange', name: '橘貓', palette: { k: '#3b2a20', o: '#f4a259', d: '#d9803a', w: '#fff4e6', p: '#f7a1b5', e: '#2b2b2b' } },
    { id: 'gray', name: '灰貓', palette: { k: '#2e3138', o: '#a4abb6', d: '#838a96', w: '#f2f3f5', p: '#f4a6b8', e: '#2b2b2b' } },
    { id: 'black', name: '黑貓', palette: { k: '#141317', o: '#3d3b45', d: '#2e2c35', w: '#5c5966', p: '#e98aa0', e: '#f5d547' } },
    { id: 'white', name: '白貓', palette: { k: '#4a4038', o: '#f7f4ef', d: '#e4ddd3', w: '#ffffff', p: '#f7a1b5', e: '#3b6fd1' } },
    { id: 'cream', name: '奶油貓', palette: { k: '#4a3622', o: '#f3d9a4', d: '#e2be7f', w: '#fffaf0', p: '#f4a6b8', e: '#2b2b2b' } },
    { id: 'brown', name: '咖啡貓', palette: { k: '#2a1a10', o: '#8b5e3c', d: '#6e4529', w: '#e9d6c2', p: '#e9a0a8', e: '#2b2b2b' } },
    { id: 'pink', name: '粉紅貓', palette: { k: '#4a2735', o: '#f6b5c8', d: '#ec93ad', w: '#fff0f5', p: '#ff7fa5', e: '#2b2b2b' } },
    { id: 'blue', name: '藍貓', palette: { k: '#1f3347', o: '#8fc1e8', d: '#6aa5d6', w: '#eef7ff', p: '#f7a1b5', e: '#2b2b2b' } },
  ];
  const PALETTE = COLORS[0].palette;

  function colorById(id) {
    return COLORS.find((c) => c.id === id) || COLORS[0];
  }

  const WIDTH = 26;
  const HEIGHT = 16;

  // Cat facing right. Rows 0-11: head and body. The tail (columns 0-4,
  // rows 0-8) comes from TAILS, the legs from LEGS.
  const BASE = [
    '.................k.....k..',
    '................kpk...kpk.',
    '...............kopokkkopok',
    '...............koodododook',
    '...............koooooooook',
    '...............koooeooeook',
    '.....kkkkkkkkkkkoooeooeook',
    '.....ododododooooowwpwwook',
    '.....oooooooooooowwwwwwok.',
    '....koooooooooooookkkkkkk.',
    '....koooowwwwwwoook.......',
    '....koooowwwwwwoook.......',
  ];

  // Tail poses, 5 columns x 9 rows, joining the body at the bottom.
  // Played in sequence they make the tail sway.
  const TAILS = [
    // 0: upright
    ['.....', '..kk.', '.kook', '.kodk', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
    // 1: leaning back
    ['.....', '.kk..', 'kook.', 'kodk.', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
    // 2: leaning far back, tip drooping
    ['.....', '.....', 'kk...', 'kok..', 'kodk.', '.kook', '.kook', '.kooo', '..kkk'],
    // 3: perked up
    ['...k.', '..kok', '.kook', '.kodk', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
  ];

  const LEGS = {
    A: [
      '....kookkkkkkkkook........',
      '....kook......kook........',
      '....kwwk......kwwk........',
      '....kkkk......kkkk........',
    ],
    B: [
      '....kkkookkkkookkk........',
      '......kook..kook..........',
      '......kwwk..kwwk..........',
      '......kkkk..kkkk..........',
    ],
  };

  const LOAF_BOTTOM = '....kkkkkkkkkkkkkkk.......';
  const EMPTY = '.'.repeat(WIDTH);

  function setChar(row, col, ch) {
    return row.slice(0, col) + ch + row.slice(col + 1);
  }

  // Build one frame. Options:
  //   legs:  'A' | 'B'               walking pose
  //   eyes:  'open' | 'closed' | 'happy'
  //   tail:  0-3                     index into TAILS
  //   lying: true                    curled up (sleeping)
  function build(opts) {
    const o = Object.assign({ legs: 'A', eyes: 'open', tail: 0, lying: false }, opts || {});
    const tail = TAILS[o.tail] || TAILS[0];
    const rows = BASE.map((row, i) => (i < tail.length ? tail[i] + row.slice(5) : row));

    if (o.eyes === 'closed') {
      rows[5] = setChar(setChar(rows[5], 19, 'o'), 22, 'o');
      rows[6] = setChar(setChar(rows[6], 19, 'k'), 22, 'k');
    } else if (o.eyes === 'happy') {
      // ^ ^ eyes and pink cheeks
      rows[5] = setChar(setChar(rows[5], 19, 'k'), 22, 'k');
      let r6 = rows[6];
      for (const [c, ch] of [[18, 'k'], [19, 'o'], [20, 'k'], [21, 'k'], [22, 'o'], [23, 'k']]) r6 = setChar(r6, c, ch);
      rows[6] = r6;
      rows[7] = setChar(setChar(rows[7], 17, 'p'), 24, 'p');
    }

    if (o.lying) return [EMPTY, EMPTY, EMPTY].concat(rows, [LOAF_BOTTOM]);
    return rows.concat(LEGS[o.legs] || LEGS.A);
  }

  const HEART = [
    '.kk.kk.',
    'kppkppk',
    'kpppppk',
    '.kpppk.',
    '..kpk..',
    '...k...',
  ];

  const ZZZ = [
    'kkkk',
    '..k.',
    '.k..',
    'kkkk',
  ];

  const BOWL = [
    '...dddd...',
    '.kddddddk.',
    'kppppppppk',
    '.kppppppk.',
    '..kkkkkk..',
  ];

  // Head only (for the app icon): columns 15-25, rows 0-9 of the open-eyed frame,
  // with the open side closed off by an outline.
  function head() {
    const rows = build({ eyes: 'open' }).slice(0, 10).map((r) => r.slice(15));
    return rows.map((r, i) => {
      let row = r;
      const first = row.search(/[^.]/);
      if (first >= 0) row = setChar(row, first, 'k');
      if (i === rows.length - 1) row = row.replace(/o/g, 'k');
      return row;
    });
  }

  return { PALETTE, COLORS, colorById, WIDTH, HEIGHT, TAIL_POSES: TAILS.length, build, head, HEART, ZZZ, BOWL };
});
