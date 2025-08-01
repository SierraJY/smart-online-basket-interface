import '@/globals.css'
import Head from './head'
import BackButton from '@/components/buttons/BackButton'
import Footer from '@/components/Footer'
import { metadata } from '@/metadata'
import TransitionWrapper from './transition-wrapper'
import { ReactNode, Suspense } from 'react'
import MenuButton from '@/components/buttons/MenuButton'
import ReactQueryProvider from "@/components/ReactQueryProvider"
import LoginOrLogout from '@/components/LoginOrLogout'
import GlobalBasketSSE from '@/components/GlobalBasketSSE'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'

export { metadata }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className='your-scroll-list overflow-y-auto'>
      <Head />
      <body className="select-none min-h-screen">
        <ReactQueryProvider>
          <ServiceWorkerProvider />
          <GlobalBasketSSE />
          <BackButton />
          <TransitionWrapper>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </TransitionWrapper>
          {/* 왼쪽 하단 모바일 접속 권장 문구 */}
          <div className="fixed left-4 bottom-4 text-sm text-left text-gray-600 z-40">
            <p className='hidden md:block' style={{color: 'var(--foreground)'}}>
              해당 페이지는 모바일에 최적화 되어있습니다
            </p>
          </div>
          <div className="fixed right-5 bottom-30 flex flex-col items-center z-50 select-none">
            <MenuButton />
          </div>
          <LoginOrLogout />
          <Footer />
        </ReactQueryProvider>
      </body>
    </html>
  )
}