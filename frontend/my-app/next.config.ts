const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  reactStrictMode: true,
  experimental: {
    serverActions: {},
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*', // 백엔드 API 주소
      },
    ]
  },

  images: {
    unoptimized: true,
    domains: ['sitem.ssgcdn.com'], // 이미지 링크 가져오기
  },
  allowedDevOrigins: [
    "http://localhost:3000", // 기본 로컬호스트 허용
    "http://172.26.6.236:3000", //  접속용 내부 IP 허용
  ],
};

module.exports = withPWA(nextConfig);