'use client'

import Link from 'next/link'
import { BsQrCode } from "react-icons/bs";

export default function BasketButton() {
  return (
    <Link href="/scan">
      <button className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm">
        <BsQrCode size={25} color="var(--foreground)" />
      </button>
    </Link>
  )
}