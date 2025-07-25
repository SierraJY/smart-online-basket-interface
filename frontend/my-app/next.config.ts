const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  experimental: {
    serverActions: {},
  },
  images: {
    unoptimized: true,
    domains: ['sitem.ssgcdn.com'], // 이미지 링크 가져오기
  },
  allowedDevOrigins: [
    "http://localhost:3000", // 기본 로컬호스트 허용
    "http://192.168.0.80:3000", //  접속용 내부 IP 허용
  ],
};

module.exports = withPWA(nextConfig);