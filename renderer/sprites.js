// Pixel-art sprites for the desktop cat.
// Each sprite is an array of equal-length strings; one character = one pixel.
// '.' is transparent, every other character is a key into PALETTE.
// Works in the browser (window.CatSprites) and in Node (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatSprites = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTE = {
    k: '#3b2a20', // outline
    o: '#f4a259', // orange fur
    d: '#d9803a', // darker stripes
    w: '#fff4e6', // white belly / muzzle / paws
    p: '#f7a1b5', // pink ears / nose / blush
    e: '#2b2b2b', // eyes
  };

  const WIDTH = 26;
  const HEIGHT = 16;

  // Cat facing right. Rows 0-11: tail, head and body. Legs are added below.
  const BASE = [
    '.................k.....k..',
    '.kk.............kpk...kpk.',
    'kook...........kopokkkopok',
    'kodk...........koodododook',
    'kook...........koooooooook',
    'kook...........koooeooeook',
    'kook.kkkkkkkkkkkoooeooeook',
    '.koooododododooooowwpwwook',
    '..kkkoooooooooooowwwwwwok.',
    '....koooooooooooookkkkkkk.',
    '....koooowwwwwwoook.......',
    '....koooowwwwwwoook.......',
  ];

  // Tail tip flicked the other way (used for idle animation).
  const TAIL_ALT_ROW1 = 'kk..............kpk...kpk.';

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
  //   tail:  0 | 1                   tail position
  //   lying: true                    curled up (sleeping)
  function build(opts) {
    const o = Object.assign({ legs: 'A', eyes: 'open', tail: 0, lying: false }, opts || {});
    const rows = BASE.slice();

    if (o.tail === 1) rows[1] = TAIL_ALT_ROW1;

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

  return { PALETTE, WIDTH, HEIGHT, build, head, HEART, ZZZ, BOWL };
});
