/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Khuyến nghị bật strict mode cho React
  // Xóa hoặc đảm bảo không có 'swcMinify: true' ở đây
  // Nếu bạn có các cấu hình khác, hãy giữ lại chúng ngoại trừ swcMinify
 env: {
    NEXT_PUBLIC_SOCKET_URL: 'https://othello-huong.onrender.com', // 👈 sửa đúng URL backend thật của Meow nha
  },
  
};

module.exports = nextConfig;
