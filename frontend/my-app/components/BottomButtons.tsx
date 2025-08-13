'use client'

import { usePathname } from 'next/navigation'
import BackButton from '@/components/buttons/BackButton'
import MenuButton from '@/components/buttons/MenuButton'

export default function BottomButtons() {
  const pathname = usePathname()
  const hideOnScan = pathname === '/scan'

  if (hideOnScan) return null

  return (
    <>
      <div className="fixed bottom-9 right-5 z-50">
        <BackButton />
      </div>
      <div className="fixed bottom-9 left-5 z-50">
        <MenuButton />
      </div>
    </>
  )
}


