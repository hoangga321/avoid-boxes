export const STAGES = [
  {
    id: "city",
    name: { en: "City", ko: "도시" },
    bg: "#E7D1A9",
    // mỗi lớp: speed(px/s), height (độ cao phần nền), color
    parallax: [
      { speed: 12,  color:"#cdbb97", height: 118 }, // skyline xa
      { speed: 24,  color:"#b49e7c", height: 92  }, // toà nhà gần
    ],
    obstacleSet: ["box","cone","wheel"],
    spawn: { baseRate: 1.2,  rateUpPerMin: 0.7,  speedMin: 190, speedMax: 320, sizeMin: 28, sizeMax: 56 }
  },
  {
    id: "noodle",
    name: { en: "Noodle Shop", ko: "라면가게" },
    bg: "#FFF2DC",
    wall: "#f7d7a8", awningA:"#ff7b7b", awningB:"#fff1d6",
    parallax: [
      { speed: 10,  color:"#f2d6a6", height: 110 },
      { speed: 22,  color:"#e7c38f", height: 80  },
    ],
    obstacleSet: ["bowl","steam","packet"],
    spawn: { baseRate: 1.2,  rateUpPerMin: 0.8,  speedMin: 190, speedMax: 330, sizeMin: 26, sizeMax: 52 }
  },
  {
    id: "gym",
    name: { en: "Gym", ko: "헬스장" },
    bg: "#E7EFEF",
    wall:"#e1d5c1", floor:"#c6ae8b",
    parallax: [
      { speed: 14,  color:"#d8c3a1", height: 115 }, // giá tạ xa
      { speed: 28,  color:"#c6ae8b", height: 85  }, // giá tạ gần
    ],
    obstacleSet: ["dumbbell","kettlebell","medicine"],
    spawn: { baseRate: 1.2,  rateUpPerMin: 0.9,  speedMin: 190, speedMax: 350, sizeMin: 30, sizeMax: 58 }
  },
];

export function getStageById(id){ return STAGES.find(s=>s.id===id) || STAGES[0]; }

