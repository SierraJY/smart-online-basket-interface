import { config } from './config/env';
// @ts-ignore
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false,
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
        source: "/api/:path*",
        destination: `${config.API_BASE_URL}/api/:path*`, // 백엔드 API 주소
      },
    ]
  },

  images: {
    unoptimized: true,
    domains: ['sitem.ssgcdn.com'], // 이미지 링크 가져오기
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    contentDispositionType: 'attachment',
  },
  allowedDevOrigins: [
    "http://localhost:3000", // 기본 로컬호스트 허용
    "http://172.26.6.236:3000", //  접속용 내부 IP 허용
  ],
};

export default withPWA(nextConfig);