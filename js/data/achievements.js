// Định nghĩa achievement + điều kiện đạt
export const ACHS = [
  { id:"a.firstDodge",   en:"First Dodge!",           ko:"첫 회피!",                 test:(ctx)=> ctx.time>=5 },
  { id:"a.near5",        en:"Near-miss Novice (5)",   ko:"니어미스 입문(5회)",         test:(ctx)=> ctx.nearTotal>=5 },
  { id:"a.near20",       en:"Near-miss Pro (20)",     ko:"니어미스 고수(20회)",         test:(ctx)=> ctx.nearTotal>=20 },
  { id:"a.survive60",    en:"Marathon (60s)",         ko:"마라톤(60초)",               test:(ctx)=> ctx.time>=60 },
  { id:"a.combo5",       en:"Combo x5",               ko:"콤보 x5",                   test:(ctx)=> ctx.comboMax>=5 },
  { id:"a.neonEquip",    en:"Neon Lover",             ko:"네온 애호가",               test:(ctx)=> ctx.equipObstacle==="skin.obstacle.neon" },
];
