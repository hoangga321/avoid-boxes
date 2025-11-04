// js/game/bgmap.js
// Khai báo ảnh nền theo stage.id. Để trống src nếu muốn dùng nền vector.
export const BG_IMAGES = {
  city:   { src: "image/city1.jpg", fit: "cover",  parallax: 0.15 },
  noodle: { src: "image/ramen1.jpg", fit: "cover",  parallax: 0.12 },
  gym:    { src: "image/gym2.jpg", fit: "cover",  parallax: 0.10 },
};

// Ví dụ:
// export const BG_IMAGES = {
//   city:   { src: "assets/bg/city-anime-01.jpg",   fit:"cover",  parallax:0.15 },
//   noodle: { src: "assets/bg/noodle-street-02.jpg",fit:"cover",  parallax:0.12 },
//   gym:    { src: "assets/bg/gym-neo-03.jpg",      fit:"cover",  parallax:0.10 },
// };
