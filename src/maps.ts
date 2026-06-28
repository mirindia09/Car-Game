import { MapData } from './types';

export const MAPS: MapData[] = [
  {
    id: 'neon_downtown',
    name: 'Neon Downtown',
    description: 'A glowing cyberpunk street circuit with wide lanes, perfect for drifting.',
    difficulty: 'Easy',
    width: 2400,
    height: 1600,
    startPos: { x: 250, y: 350, angle: 0 },
    laps: 3,
    checkpoints: [
      { x: 1200, y: 300, radius: 120 }, // CP 1 (Top straight)
      { x: 2100, y: 800, radius: 120 }, // CP 2 (Right curve)
      { x: 1200, y: 1300, radius: 120 },// CP 3 (Bottom)
      { x: 250, y: 1100, radius: 120 }, // CP 4 (Left curve)
      { x: 250, y: 350, radius: 120 }    // Finish line CP
    ],
    // Inner and outer boundaries (line segments) to keep cars on track
    walls: [
      // Outer track border box
      { x1: 50, y1: 50, x2: 2350, y2: 50 },
      { x1: 2350, y1: 50, x2: 2350, y2: 1550 },
      { x1: 2350, y1: 1550, x2: 50, y2: 1550 },
      { x1: 50, y1: 1550, x2: 50, y2: 50 },

      // Inner barrier (island in center that makes it a loop)
      { x1: 500, y1: 550, x2: 1900, y2: 550 },
      { x1: 1900, y1: 550, x2: 1900, y2: 1050 },
      { x1: 1900, y1: 1050, x2: 500, y2: 1050 },
      { x1: 500, y1: 1050, x2: 500, y2: 550 },

      // Extra buildings/pillars as obstacles
      { x1: 1000, y1: 50, x2: 1000, y2: 250 }, // Chicane top
      { x1: 1400, y1: 1550, x2: 1400, y2: 1350 } // Chicane bottom
    ],
    destructibles: [
      // Placing obstacles along the track
      { id: 'cone_1', type: 'cone', x: 600, y: 200 },
      { id: 'cone_2', type: 'cone', x: 650, y: 220 },
      { id: 'cone_3', type: 'cone', x: 700, y: 240 },
      
      { id: 'barrel_1', type: 'barrel', x: 1100, y: 180 },
      { id: 'barrel_2', type: 'barrel', x: 1150, y: 180 },
      { id: 'barrel_3', type: 'barrel', x: 1200, y: 180 },

      { id: 'box_1', type: 'box', x: 2100, y: 500 },
      { id: 'box_2', type: 'box', x: 2150, y: 520 },
      { id: 'box_3', type: 'box', x: 2050, y: 480 },

      { id: 'barrier_1', type: 'barrier', x: 1500, y: 1200 },
      { id: 'barrier_2', type: 'barrier', x: 1520, y: 1250 }
    ],
    shortcuts: [
      {
        id: 'neon_shortcut_1',
        x: 1000,
        y: 450,
        width: 150,
        height: 200,
        isRevealed: false,
        destructibleBarrierId: 'barrier_1' // Break this barrier to open the shortcut
      }
    ]
  },
  {
    id: 'harbor_docks',
    name: 'Harbor Docks',
    description: 'An industrial waterfront zone with slick wet pavement, containers, and a devious shortcut.',
    difficulty: 'Medium',
    width: 2400,
    height: 1800,
    startPos: { x: 300, y: 1500, angle: -Math.PI / 2 },
    laps: 3,
    checkpoints: [
      { x: 300, y: 400, radius: 120 },  // CP 1 (Top left dock)
      { x: 1200, y: 350, radius: 120 }, // CP 2 (Top straight)
      { x: 2100, y: 400, radius: 120 }, // CP 3 (Right warehouse)
      { x: 1800, y: 1400, radius: 120 },// CP 4 (Bottom right)
      { x: 300, y: 1500, radius: 120 }  // Finish line CP
    ],
    walls: [
      // Outer border (Waterfront limits)
      { x1: 100, y1: 100, x2: 2300, y2: 100 },
      { x1: 2300, y1: 100, x2: 2300, y2: 1700 },
      { x1: 2300, y1: 1700, x2: 100, y2: 1700 },
      { x1: 100, y1: 1700, x2: 100, y2: 100 },

      // Giant shipping containers / buildings blocking direct routes
      // Container Block A
      { x1: 600, y1: 600, x2: 1100, y2: 600 },
      { x1: 1100, y1: 600, x2: 1100, y2: 1200 },
      { x1: 1100, y1: 1200, x2: 600, y2: 1200 },
      { x1: 600, y1: 1200, x2: 600, y2: 600 },

      // Container Block B
      { x1: 1400, y1: 600, x2: 1900, y2: 600 },
      { x1: 1900, y1: 600, x2: 1900, y2: 1200 },
      { x1: 1900, y1: 1200, x2: 1400, y2: 1200 },
      { x1: 1400, y1: 1200, x2: 1400, y2: 600 },

      // Dock side dividers
      { x1: 100, y1: 900, x2: 400, y2: 900 }
    ],
    destructibles: [
      // Cones scattered
      { id: 'cone_d1', type: 'cone', x: 250, y: 800 },
      { id: 'cone_d2', type: 'cone', x: 350, y: 800 },
      { id: 'barrel_d1', type: 'barrel', x: 1200, y: 500 },
      { id: 'barrel_d2', type: 'barrel', x: 1250, y: 500 },
      { id: 'box_d1', type: 'box', x: 1500, y: 200 },
      { id: 'box_d2', type: 'box', x: 1530, y: 230 },
      
      // Shortcut-blocking heavy barrier
      { id: 'heavy_barrier_harbor', type: 'barrier', x: 1250, y: 900 }
    ],
    shortcuts: [
      {
        id: 'harbor_shortcut',
        x: 1100,
        y: 800,
        width: 300,
        height: 200,
        isRevealed: false,
        destructibleBarrierId: 'heavy_barrier_harbor'
      }
    ]
  },
  {
    id: 'subway_escape',
    name: 'Subway Escape',
    description: 'An icy grid mixing subway tunnels and elevated highway structures. Hard frozen turns!',
    difficulty: 'Hard',
    width: 2600,
    height: 2000,
    startPos: { x: 200, y: 200, angle: 0 },
    laps: 3,
    checkpoints: [
      { x: 1200, y: 200, radius: 120 }, // CP 1
      { x: 2400, y: 600, radius: 120 }, // CP 2
      { x: 2400, y: 1600, radius: 120 },// CP 3
      { x: 1300, y: 1700, radius: 120 },// CP 4
      { x: 200, y: 1200, radius: 120 }, // CP 5
      { x: 200, y: 200, radius: 120 }    // Finish CP
    ],
    walls: [
      // Outer borders
      { x1: 50, y1: 50, x2: 2550, y2: 50 },
      { x1: 2550, y1: 50, x2: 2550, y2: 1950 },
      { x1: 2550, y1: 1950, x2: 50, y2: 1950 },
      { x1: 50, y1: 1950, x2: 50, y2: 50 },

      // Subway station column walls
      { x1: 600, y1: 400, x2: 800, y2: 400 },
      { x1: 800, y1: 400, x2: 800, y2: 1000 },
      { x1: 800, y1: 1000, x2: 600, y2: 1000 },
      { x1: 600, y1: 1000, x2: 600, y2: 400 },

      { x1: 1800, y1: 1000, x2: 2000, y2: 1000 },
      { x1: 2000, y1: 1000, x2: 2000, y2: 1600 },
      { x1: 2000, y1: 1600, x2: 1800, y2: 1600 },
      { x1: 1800, y1: 1600, x2: 1800, y2: 1000 },

      // Inner maze partitions
      { x1: 1200, y1: 400, x2: 1200, y2: 1400 },
      { x1: 600, y1: 1400, x2: 1200, y2: 1400 }
    ],
    destructibles: [
      { id: 'cone_s1', type: 'cone', x: 1100, y: 200 },
      { id: 'cone_s2', type: 'cone', x: 1100, y: 230 },
      { id: 'cone_s3', type: 'cone', x: 1100, y: 260 },
      { id: 'barrel_s1', type: 'barrel', x: 2100, y: 1300 },
      { id: 'barrel_s2', type: 'barrel', x: 2150, y: 1300 },
      { id: 'box_s1', type: 'box', x: 1400, y: 1500 },
      { id: 'box_s2', type: 'box', x: 1450, y: 1500 },
      
      // Shortcut blocker (wooden boards barrier)
      { id: 'subway_secret_gate', type: 'barrier', x: 1200, y: 1500 }
    ],
    shortcuts: [
      {
        id: 'subway_tunnel_shortcut',
        x: 1150,
        y: 1400,
        width: 100,
        height: 200,
        isRevealed: false,
        destructibleBarrierId: 'subway_secret_gate'
      }
    ]
  }
];
