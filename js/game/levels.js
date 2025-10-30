// Định nghĩa chuỗi level cho mỗi stage.
// Mỗi level: { goalTimeSec, bonusNearMiss }
export const LEVELS = {
  city:   [{goalTimeSec:15, bonusNearMiss:3},
           {goalTimeSec:30, bonusNearMiss:6},
           {goalTimeSec:45, bonusNearMiss:10}],
  noodle: [{goalTimeSec:18, bonusNearMiss:3},
           {goalTimeSec:36, bonusNearMiss:7},
           {goalTimeSec:54, bonusNearMiss:12}],
  gym:    [{goalTimeSec:20, bonusNearMiss:4},
           {goalTimeSec:40, bonusNearMiss:8},
           {goalTimeSec:60, bonusNearMiss:14}],
};

export function getLevel(stageId, idx){
  const arr = LEVELS[stageId] || LEVELS.city;
  const i = Math.max(0, Math.min(idx, arr.length-1));
  return { idx:i, total:arr.length, ...arr[i] };
}
