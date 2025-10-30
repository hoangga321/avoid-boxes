// AABB đơn giản + near-miss theo khoảng cách cạnh (mặc định 8px)
export function aabbIntersect(a, b){
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function nearMiss(a, b, dist=8){
  // Nếu không giao nhau và khoảng cách trục X hoặc Y <= dist → near miss
  if (aabbIntersect(a,b)) return false;
  const dx = Math.max(b.x - (a.x+a.w), a.x - (b.x+b.w), 0);
  const dy = Math.max(b.y - (a.y+a.h), a.y - (b.y+b.h), 0);
  // Khoảng cách Manhattan hoặc Euclid đều được; dùng Euclid cho “sát” hơn
  const d = Math.hypot(dx, dy);
  return d > 0 && d <= dist;
}
