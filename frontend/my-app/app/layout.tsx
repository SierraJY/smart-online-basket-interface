import '@/globals.css'
import Head from './head'
import BackButton from '@/components/BackButton'
import Footer from '@/components/Footer'
import { metadata } from '@/metadata'
import TransitionWrapper from './transition-wrapper'
import { ReactNode, Suspense } from 'react'
import LoginOrLogout from '@/components/LoginOrLogout'
import MenuButton from '@/components/MenuButton'



export { metadata }


export default function RootLayout({ children }: { children: ReactNode }) {
  
  return (
    <html lang="ko" className='your-scroll-list overflow-y-auto'>
      <Head />
      <body className="select-none min-h-screen pb-12">
        <BackButton />
        <TransitionWrapper>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </TransitionWrapper>
        <div className="fixed bottom-26 w-full text-sm text-center text-gray-600 z-40">
          <LoginOrLogout />
        </div>
        {/* 왼쪽 하단 모바일 접속 권장 문구 */}
        <div className="fixed left-4 bottom-4 text-sm text-left text-gray-600 z-40">
          <p className='hidden md:block' style={{color: 'var(--foreground)'}}>
            해당 페이지는 모바일에 최적화 되어있습니다
          </p>
        </div>
        <div className="fixed right-5 bottom-30 flex flex-col items-center z-50 select-none">
          <MenuButton />
        </div>
        <Footer />
      </body>
    </html>
  )
}