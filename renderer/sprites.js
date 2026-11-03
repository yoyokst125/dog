// Pixel-art sprites for the desktop pets.
// Each sprite is an array of equal-length strings; one character = one pixel.
// '.' is transparent, every other character is a key into the pet's palette.
// Works in the browser (window.PetSprites) and in Node (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PetSprites = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WIDTH = 26;
  const HEIGHT = 16;
  const EMPTY = '.'.repeat(WIDTH);

  function setChar(row, col, ch) {
    return row.slice(0, col) + ch + row.slice(col + 1);
  }

  function setChars(row, pairs) {
    return pairs.reduce((r, [c, ch]) => setChar(r, c, ch), row);
  }

  // Draws `pose` over `rows` starting at column `left`, skipping '.' pixels.
  function overlay(rows, pose, left = 0) {
    return rows.map((row, i) => {
      if (i >= pose.length) return row;
      let r = row;
      for (let c = 0; c < pose[i].length; c++) if (pose[i][c] !== '.') r = setChar(r, left + c, pose[i][c]);
      return r;
    });
  }

  function makeColorLookup(colors) {
    return (id) => colors.find((c) => c.id === id) || colors[0];
  }

  // ======================================================================
  // Cat
  // Colour keys: k outline, o fur, d stripes, w belly / muzzle / paws,
  //              p ears / nose / blush, e eyes
  // ======================================================================
  const CAT_COLORS = [
    { id: 'orange', name: '橘貓', palette: { k: '#3b2a20', o: '#f4a259', d: '#d9803a', w: '#fff4e6', p: '#f7a1b5', e: '#2b2b2b' } },
    { id: 'gray', name: '灰貓', palette: { k: '#2e3138', o: '#a4abb6', d: '#838a96', w: '#f2f3f5', p: '#f4a6b8', e: '#2b2b2b' } },
    { id: 'black', name: '黑貓', palette: { k: '#141317', o: '#3d3b45', d: '#2e2c35', w: '#5c5966', p: '#e98aa0', e: '#f5d547' } },
    { id: 'white', name: '白貓', palette: { k: '#4a4038', o: '#f7f4ef', d: '#e4ddd3', w: '#ffffff', p: '#f7a1b5', e: '#3b6fd1' } },
    { id: 'cream', name: '奶油貓', palette: { k: '#4a3622', o: '#f3d9a4', d: '#e2be7f', w: '#fffaf0', p: '#f4a6b8', e: '#2b2b2b' } },
    { id: 'brown', name: '咖啡貓', palette: { k: '#2a1a10', o: '#8b5e3c', d: '#6e4529', w: '#e9d6c2', p: '#e9a0a8', e: '#2b2b2b' } },
    { id: 'pink', name: '粉紅貓', palette: { k: '#4a2735', o: '#f6b5c8', d: '#ec93ad', w: '#fff0f5', p: '#ff7fa5', e: '#2b2b2b' } },
    { id: 'blue', name: '藍貓', palette: { k: '#1f3347', o: '#8fc1e8', d: '#6aa5d6', w: '#eef7ff', p: '#f7a1b5', e: '#2b2b2b' } },
  ];

  // Cat facing right. Rows 0-11: head and body. The tail (columns 0-4,
  // rows 0-8) comes from CAT_TAILS, the legs from CAT_LEGS.
  const CAT_BASE = [
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
  const CAT_TAILS = [
    // 0: upright
    ['.....', '..kk.', '.kook', '.kodk', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
    // 1: leaning back
    ['.....', '.kk..', 'kook.', 'kodk.', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
    // 2: leaning far back, tip drooping
    ['.....', '.....', 'kk...', 'kok..', 'kodk.', '.kook', '.kook', '.kooo', '..kkk'],
    // 3: perked up
    ['...k.', '..kok', '.kook', '.kodk', '.kook', '.kook', '.kook', '.kooo', '..kkk'],
  ];

  const CAT_LEGS = {
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

  const CAT_LOAF_BOTTOM = '....kkkkkkkkkkkkkkk.......';

  // Build one cat frame. Options:
  //   legs:  'A' | 'B'               walking pose
  //   eyes:  'open' | 'closed' | 'happy'
  //   tail:  index into CAT_TAILS
  //   lying: true                    curled up (sleeping)
  function buildCat(opts) {
    const o = Object.assign({ legs: 'A', eyes: 'open', tail: 0, lying: false }, opts || {});
    const tail = CAT_TAILS[o.tail] || CAT_TAILS[0];
    const rows = CAT_BASE.map((row, i) => (i < tail.length ? tail[i] + row.slice(5) : row));

    if (o.eyes === 'closed') {
      rows[5] = setChars(rows[5], [[19, 'o'], [22, 'o']]);
      rows[6] = setChars(rows[6], [[19, 'k'], [22, 'k']]);
    } else if (o.eyes === 'happy') {
      // ^ ^ eyes and pink cheeks
      rows[5] = setChars(rows[5], [[19, 'k'], [22, 'k']]);
      rows[6] = setChars(rows[6], [[18, 'k'], [19, 'o'], [20, 'k'], [21, 'k'], [22, 'o'], [23, 'k']]);
      rows[7] = setChars(rows[7], [[17, 'p'], [24, 'p']]);
    }

    if (o.lying) return [EMPTY, EMPTY, EMPTY].concat(rows, [CAT_LOAF_BOTTOM]);
    return rows.concat(CAT_LEGS[o.legs] || CAT_LEGS.A);
  }

  // Head only (for the app icon): columns 15-25, rows 0-9 of the open-eyed
  // frame, with the open side closed off by an outline.
  function catHead() {
    const rows = buildCat({ eyes: 'open' }).slice(0, 10).map((r) => r.slice(15));
    return rows.map((r, i) => {
      let row = r;
      const first = row.search(/[^.]/);
      if (first >= 0) row = setChar(row, first, 'k');
      if (i === rows.length - 1) row = row.replace(/o/g, 'k');
      return row;
    });
  }

  const cat = {
    id: 'cat',
    name: '貓咪',
    WIDTH,
    HEIGHT,
    HEAD_COL: 20.5, // head centre column when facing right
    lyingRows: 3, // how far the head drops when lying down
    COLORS: CAT_COLORS,
    colorById: makeColorLookup(CAT_COLORS),
    TAIL_POSES: CAT_TAILS.length,
    tailAnims: {
      idle: { seq: [0, 1, 2, 1, 0, 3], step: 0.22 },
      walk: { seq: [0, 1, 0, 3], step: 0.3 },
      happy: { seq: [1, 2, 1, 0, 3, 0], step: 0.1 },
      sleep: { seq: [0, 1], step: 1.4 },
      drag: { seq: [3], step: 1 },
    },
    build: buildCat,
    head: catHead,
    lines: {
      hello: ['喵～', '我來了喵！'],
      pet: ['喵～', '喵喵！', '喵？', '呼嚕呼嚕…', '喵嗚～', '再摸一下喵'],
      wake: ['喵…？', '被吵醒了喵…'],
      feed: ['開動了喵～', '好吃喵！'],
      full: ['吃不下了喵…'],
      play: ['好好玩喵！', '再來再來！'],
      tired: ['沒力氣玩了喵…'],
      land: ['喵！', '嚇死喵了！'],
      hungry: ['肚子餓了喵…', '想吃罐罐…'],
      lonely: ['陪我玩嘛…', '好無聊喵…'],
      sleep: ['呼…', '晚安喵…'],
      color: ['換新毛色了喵！', '好看嗎喵？'],
    },
  };

  // ======================================================================
  // Shih Tzu
  // Colour keys: k outline, o coat, d darker coat, w white coat / muzzle / beard,
  //              p tongue / blush, e eyes and nose, r top-knot bow
  // ======================================================================
  const SHIHTZU_COLORS = [
    { id: 'gold', name: '金白', palette: { k: '#3b2a20', o: '#e8b66a', d: '#c98f45', w: '#fffaf0', p: '#f58fa0', e: '#1e1a18', r: '#e5484d' } },
    { id: 'brown', name: '棕白', palette: { k: '#2a1a10', o: '#9a6a43', d: '#7a4f2e', w: '#fbf4ea', p: '#f58fa0', e: '#1e1a18', r: '#4f8fe0' } },
    { id: 'black', name: '黑白', palette: { k: '#141317', o: '#3d3a44', d: '#2b2930', w: '#f7f7f7', p: '#f58fa0', e: '#0d0c0f', r: '#f07ab0' } },
    { id: 'silver', name: '銀白', palette: { k: '#2e3138', o: '#c3c7cf', d: '#a3a8b3', w: '#ffffff', p: '#f58fa0', e: '#1e1a18', r: '#9b6ee0' } },
    { id: 'cream', name: '奶油', palette: { k: '#4a3622', o: '#f3dcae', d: '#e2c48b', w: '#fffdf6', p: '#f58fa0', e: '#1e1a18', r: '#e5484d' } },
    { id: 'red', name: '紅棕', palette: { k: '#2a140c', o: '#c4703a', d: '#a1562a', w: '#fff6ec', p: '#f58fa0', e: '#1e1a18', r: '#f2c230' } },
  ];

  // Shih Tzu facing right: long coat, hanging ears, white beard and a bow.
  // The tail plume (columns 3-10, rows 0-5) comes from SHIHTZU_TAILS.
  const SHIHTZU_BASE = [
    '..................krkrk...',
    '.................krrkrrk..',
    '.................kkkkkkk..',
    '................koowwwook.',
    '...............kooowwwoook',
    '......kkkkkkkkkkooewwweook',
    '.....koodooooookooewwweook',
    '....kooooododookowwwewwwok',
    '....kodooooooookowwwpwwwok',
    '....kooooooooookoowwwwwook',
    '....koowwwwwwookookwwwkook',
    '....kowwwwwwwwwwkkkkwk.kk.',
    '....kowwwwwwwwwwwok.......',
    '....kwwwwwwwwwwwwwk.......',
  ];
  const SHIHTZU_TAIL_LEFT = 3;

  // Tail plume curled over the back; the top sways left and right.
  const SHIHTZU_TAILS = [
    // 0: centre
    ['..kkkk..', '.kooook.', '.koddok.', '.kooook.', '..kook..', '...oo...'],
    // 1: swung back
    ['.kkkk...', 'kooook..', 'koddok..', 'kooook..', '..kook..', '...oo...'],
    // 2: swung forward
    ['...kkkk.', '..kooook', '..koddok', '..kooook', '..kook..', '...oo...'],
  ];

  // Paws peeking out from under the long coat.
  const SHIHTZU_LEGS = {
    A: ['.....kkwwkkkkkwwkk........', '......kkkk...kkkk.........'],
    B: ['.....kkkkwwkwwkkkk........', '........kkkkkkk...........'],
  };

  const SHIHTZU_LYING_BOTTOM = '....' + 'k'.repeat(WIDTH - 4);

  function buildShihTzu(opts) {
    const o = Object.assign({ legs: 'A', eyes: 'open', tail: 0, lying: false }, opts || {});
    const rows = overlay(SHIHTZU_BASE, SHIHTZU_TAILS[o.tail] || SHIHTZU_TAILS[0], SHIHTZU_TAIL_LEFT);

    if (o.eyes === 'closed') {
      rows[5] = setChars(rows[5], [[18, 'o'], [22, 'o']]);
      rows[6] = setChars(rows[6], [[18, 'k'], [22, 'k']]);
    } else if (o.eyes === 'happy') {
      // ^ ^ eyes, pink cheeks and tongue out
      rows[5] = setChars(rows[5], [[18, 'k'], [22, 'k']]);
      rows[6] = setChars(rows[6], [[17, 'k'], [18, 'o'], [19, 'k'], [21, 'k'], [22, 'o'], [23, 'k']]);
      rows[7] = setChars(rows[7], [[17, 'p'], [23, 'p']]);
      rows[9] = setChar(rows[9], 20, 'p');
    }

    if (o.lying) {
      // lie flat: drop the lower coat rows and rest the chin on the ground
      return [EMPTY, EMPTY, EMPTY, EMPTY].concat(rows.slice(0, 11), [SHIHTZU_LYING_BOTTOM]);
    }
    return rows.concat(SHIHTZU_LEGS[o.legs] || SHIHTZU_LEGS.A);
  }

  const shihtzu = {
    id: 'shihtzu',
    name: '西施犬',
    WIDTH,
    HEIGHT,
    HEAD_COL: 20.5,
    lyingRows: 4,
    COLORS: SHIHTZU_COLORS,
    colorById: makeColorLookup(SHIHTZU_COLORS),
    TAIL_POSES: SHIHTZU_TAILS.length,
    tailAnims: {
      idle: { seq: [0, 1, 0, 2], step: 0.18 },
      walk: { seq: [1, 0, 2, 0], step: 0.15 },
      happy: { seq: [1, 2], step: 0.07 },
      sleep: { seq: [0], step: 1 },
      drag: { seq: [2], step: 1 },
    },
    build: buildShihTzu,
    lines: {
      hello: ['汪！', '我來了汪！'],
      pet: ['汪！', '汪汪！', '嗷嗚～', '搖尾巴中～', '再摸摸汪', '最喜歡你了汪！'],
      wake: ['汪…？', '被吵醒了汪…'],
      feed: ['開動了汪！', '好吃汪！'],
      full: ['吃不下了汪…'],
      play: ['好好玩汪！', '丟球球！'],
      tired: ['沒力氣玩了汪…'],
      land: ['汪！', '嚇死汪了！'],
      hungry: ['肚子餓了汪…', '想吃肉肉…'],
      lonely: ['陪我散步嘛…', '好無聊汪…'],
      sleep: ['呼…', '晚安汪…'],
      color: ['換新造型了汪！', '好看嗎汪？'],
    },
  };

  // ======================================================================
  // Shared props (always drawn with the default palette)
  // ======================================================================
  const PALETTE = CAT_COLORS[0].palette;

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

  const species = { cat, shihtzu };

  return { species, PALETTE, WIDTH, HEIGHT, HEART, ZZZ, BOWL };
});
