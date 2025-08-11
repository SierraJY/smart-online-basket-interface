
// @ts-ignore
import nextPWA from 'next-pwa';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // disable: false,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/sitem\.ssgcdn\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'ssg-images',
        expiration: {
          maxEntries: 50, // 100 → 50으로 줄임
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100, // 200 → 100으로 줄임
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
        },
      },
    },
    {
      urlPattern: new RegExp(`^${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://sobi-basket.app'}/api/.*`, 'i'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 25, // 50 → 25로 줄임
          maxAgeSeconds: 60 * 60 * 24, // 1일
        },
        networkTimeoutSeconds: 30, // 3초 → 30초로 증가
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker 빌드를 위해 활성화
  // 개발 환경에서 허용할 origin 설정
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://sobi-basket.app',
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
    'https://localhost',
    'http://localhost',
    'http://192.168.0.80:3001', // 폰 테스트용 IP 추가
    'http://192.168.0.80:8082'  // 백엔드 테스트용 IP 추가
  ],
  reactStrictMode: true,
  experimental: {
    serverActions: {},
    optimizeCss: true,
    optimizePackageImports: ['react-icons', 'lucide-react'],
    // 성능 최적화 추가
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },  
  
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`, // 백엔드 API 주소
      },
    ]
  },


  // 이미지 도메인 설정 (극한 최적화)
  images: {
    unoptimized: false, // 최적화 활성화
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sitem.ssgcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/^https?:\/\//, '') || 'sobi-basket.app',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // 2048, 3840 제거
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // 384 제거
    formats: ['image/webp'], // AVIF 제거 (브라우저 호환성)
    minimumCacheTTL: 31536000, // 1년 캐시
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    contentDispositionType: 'attachment',
    // 성능 최적화 설정
    loader: 'default',
  },

  // 웹팩 최적화 (극한 성능 최적화)
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // 개발 환경에서 파일 감시 설정
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // 1초마다 파일 변경 감지
        aggregateTimeout: 300, // 300ms 대기 후 재빌드
        ignored: ['**/node_modules', '**/.next', '**/.git'],
      };
    }
    
    // 프로덕션에서만 최적화 적용
    if (!dev && !isServer) {
      // 번들 분석기 추가 (선택사항)
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      
      // 코드 스플리팅 최적화
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
          },
        },
      };
      
      // 미니피케이션 최적화
      config.optimization.minimize = true;
    }
    
    return config;
  },

  // HTTPS 환경 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
};

module.exports = withPWA(nextConfig);