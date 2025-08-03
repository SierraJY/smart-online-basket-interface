import '@/globals.css'
import Head from './head'
import BackButton from '@/components/buttons/BackButton'
import Footer from '@/components/Footer'
import { metadata } from '@/metadata'
import TransitionWrapper from './transition-wrapper'
import { ReactNode, Suspense } from 'react'
import MenuButton from '@/components/buttons/MenuButton'
import ReactQueryProvider from "@/components/ReactQueryProvider"
import GlobalBasketSSE from '@/components/GlobalBasketSSE'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { Toaster } from 'react-hot-toast'

export { metadata }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className='your-scroll-list overflow-y-auto'>
      <Head />
      <body className="select-none min-h-screen">
        <ReactQueryProvider>
          <ServiceWorkerProvider />
          <GlobalBasketSSE />
          {/* <TransitionWrapper> */}
            <Suspense fallback={null}>
              {children}
            </Suspense>
          {/* </TransitionWrapper> */}
          {/* 왼쪽 하단 모바일 접속 권장 문구 */}
          <div className="fixed left-4 bottom-4 text-sm text-left text-gray-600 z-40">
            <p className='text-lg hidden md:block' style={{color: 'var(--foreground)'}}>
              해당 페이지는 모바일에 최적화 되어있습니다
            </p>
          </div>
          <Footer />
          
          {/* MenuButton - 오른쪽에 배치 */}
          <div className="fixed bottom-6 right-4 z-50">
            <MenuButton />
          </div>
          
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 2000,
              style: {
                background: 'var(--footer-background)',
                color: 'var(--foreground)',
                border: '1px solid var(--footer-border)',
              },
            }}
          />
        </ReactQueryProvider>
      </body>
    </html>
  )
}