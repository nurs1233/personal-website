window.__CONSTELLATIONS__ = [
  {
    name: 'Orion',
    id: 'ori',
    stars: [
      [88.79, 7.41],    // Betelgeuse
      [81.28, 6.35],    // Bellatrix
      [84.05, -1.20],   // Alnilam (belt center)
      [85.19, -1.94],   // Alnitak (belt left)
      [83.00, -0.30],   // Mintaka (belt right)
      [86.94, -9.67],   // Saiph
      [78.63, -8.20],   // Rigel
      [83.78, 9.93],    // Meissa
    ],
    lines: [[0,1],[1,2],[2,3],[2,4],[3,4],[0,5],[1,6],[3,6],[4,6],[5,6],[0,7],[1,7]],
    names: ['Betelgeuse','Bellatrix','Alnilam','Alnitak','Mintaka','Saiph','Rigel','Meissa']
  },
  {
    name: 'Scorpius',
    id: 'sco',
    stars: [
      [247.35, -26.43],  // Antares (heart)
      [242.34, -19.81],  // Graffias/Acrab (head)
      [240.08, -22.62],  // Dschubba (head)
      [239.22, -25.28],  // Fang (claw)
      [245.30, -28.22],  // Alniyat (near heart)
      [262.68, -37.10],  // Lesath (tail)
      [263.30, -37.10],  // Shaula (tail)
    ],
    lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6],[1,6]],
    names: ['Antares','Graffias','Dschubba','Fang','Alniyat','Lesath','Shaula']
  },
  {
    name: 'Crux',
    id: 'cru',
    stars: [
      [186.65, -63.10],  // Acrux (bottom)
      [190.38, -59.69],  // Becrux/Mimosa (left)
      [188.05, -57.11],  // Gacrux (top)
      [184.06, -58.64],  // Delta Crucis (right)
    ],
    lines: [[0,1],[1,2],[2,3],[3,0]],
    names: ['Acrux','Mimosa','Gacrux','Delta Crucis']
  },
  {
    name: 'Canis Major',
    id: 'cma',
    stars: [
      [101.29, -16.72],  // Sirius
      [104.66, -28.97],  // Adhara
      [106.94, -26.39],  // Wezen
      [110.58, -29.30],  // Aludra
      [95.94, -30.05],   // Furud
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[0,2]],
    names: ['Sirius','Adhara','Wezen','Aludra','Furud']
  },
  {
    name: 'Leo',
    id: 'leo',
    stars: [
      [152.09, 11.97],   // Regulus
      [177.27, 14.57],   // Denebola
      [154.99, 19.84],   // Algieba
      [168.56, 20.52],   // Zosma
      [149.73, 23.77],   // Rasalas
    ],
    lines: [[0,1],[0,2],[2,4],[2,3],[3,1]],
    names: ['Regulus','Denebola','Algieba','Zosma','Rasalas']
  },
  {
    name: 'Carina',
    id: 'car',
    stars: [
      [128.33, -59.51],  // Canopus
      [140.53, -59.45],  // Miaplacidus
      [157.53, -63.54],  // Avior
      [143.22, -59.69],  // Theta Car
      [153.76, -61.26],  // Upsilon Car
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[1,3],[2,4]],
    names: ['Canopus','Miaplacidus','Avior','Theta','Upsilon']
  },
  {
    name: 'Sagittarius',
    id: 'sgr',
    stars: [
      [284.91, -29.36],  // Kaus Australis
      [282.52, -26.19],  // Kaus Media
      [280.76, -26.60],  // Kaus Borealis
      [276.74, -24.68],  // Nunki
      [289.27, -21.13],  // Ascella
      [283.82, -28.23],  // Alnasl
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,5]],
    names: ['Kaus Australis','Kaus Media','Kaus Borealis','Nunki','Ascella','Alnasl']
  },
  {
    name: 'Centaurus',
    id: 'cen',
    stars: [
      [201.30, -47.29],  // Alpha Cen (Rigil Kent)
      [210.96, -60.37],  // Beta Cen (Hadar)
      [218.87, -53.07],  // Theta Cen
      [206.99, -40.97],  // Gamma Cen
      [212.06, -49.17],  // Delta Cen
      [203.19, -53.55],  // Epsilon Cen
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,4],[1,5]],
    names: ['Rigil Kent','Hadar','Theta','Gamma','Delta','Epsilon']
  },
  {
    name: 'Taurus',
    id: 'tau',
    stars: [
      [103.93, 16.52],   // Aldebaran
      [102.54, 21.12],   // Elnath
      [107.43, 15.39],   // Prima Hyadum
      [108.30, 16.81],   // Secunda Hyadum
      [104.18, 18.14],   // Theta Tau
    ],
    lines: [[0,1],[0,2],[2,3],[3,0],[4,0]],
    names: ['Aldebaran','Elnath','Prima Hyadum','Secunda Hyadum','Theta Tau']
  },
  {
    name: 'Pleiades',
    id: 'm45',
    stars: [
      [106.03, 23.96],   // Alcyone
      [106.18, 24.11],   // Atlas
      [106.02, 23.86],   // Electra
      [106.04, 23.49],   // Maia
      [105.97, 23.78],   // Merope
      [106.12, 23.37],   // Taygeta
      [106.06, 23.56],   // Celaeno
      [106.05, 24.38],   // Pleione
    ],
    lines: [[0,1],[0,2],[0,3],[3,4],[4,5],[5,6],[6,0],[7,1]],
    names: ['Alcyone','Atlas','Electra','Maia','Merope','Taygeta','Celaeno','Pleione']
  }
]
