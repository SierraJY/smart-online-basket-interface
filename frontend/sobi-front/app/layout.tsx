import '@/globals.css'
import Head from './head'
import Footer from '@/components/Footer'
import { metadata } from '@/metadata'
import TransitionWrapper from './transition-wrapper'
import { ReactNode, Suspense } from 'react'
import BottomButtons from '@/components/BottomButtons'
import ReactQueryProvider from "@/components/ReactQueryProvider"
import GlobalBasketSSE from '@/components/GlobalBasketSSE'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { Toaster } from 'react-hot-toast'
import GuestTimeOut from '@/components/GuestTimeOut'
// 개발용 테스트 컴포넌트 (배포 시 이 줄만 주석 처리)
// import TestForDev from '@/components/modals/TestForDev'

export { metadata }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className='your-scroll-list overflow-y-auto'>
      <Head />
      <body className="select-none min-h-screen">
        {/* 확대/축소 완전 차단 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 확대/축소 완전 차단
              document.addEventListener('touchstart', function(event) {
                if (event.touches.length > 1) {
                  event.preventDefault();
                }
              }, { passive: false });
              
              document.addEventListener('touchend', function(event) {
                if (event.touches.length > 1) {
                  event.preventDefault();
                }
              }, { passive: false });
              
              document.addEventListener('touchmove', function(event) {
                if (event.touches.length > 1) {
                  event.preventDefault();
                }
              }, { passive: false });
              
              // 더블 탭 줌 방지
              let lastTouchEnd = 0;
              document.addEventListener('touchend', function(event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                  event.preventDefault();
                }
                lastTouchEnd = now;
              }, false);
              
              // 핀치 줌 방지
              document.addEventListener('gesturestart', function(event) {
                event.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gesturechange', function(event) {
                event.preventDefault();
              }, { passive: false });
              
              document.addEventListener('gestureend', function(event) {
                event.preventDefault();
              }, { passive: false });
            `
          }}
        />
        <ReactQueryProvider>
          <ServiceWorkerProvider />
          <GlobalBasketSSE />
          {/* 개발용 테스트 컴포넌트 (배포 시 이 줄만 주석 처리) */}
          {/* <TestForDev /> */}
          <TransitionWrapper>
          
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </TransitionWrapper>
          {/* 왼쪽 하단 모바일 접속 권장 문구 */}
          <div className="fixed left-4 bottom-4 text-sm text-left text-gray-600 z-40">
            <p className='text-lg hidden md:block' style={{color: 'var(--foreground)'}}>
              해당 페이지는 모바일에 최적화 되어있습니다
            </p>
          </div>
          <GuestTimeOut />
          <BottomButtons />
          <Footer />
          
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 2000,
              style: {
                background: 'var(--footer-background)',
                color: 'var(--foreground)',
                border: '1px solid var(--footer-border)',
              }
            }}
          />
          

        </ReactQueryProvider>
      </body>
    </html>
  )
}