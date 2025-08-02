'use client'

import Link from 'next/link'
import { BsFillBasket3Fill } from "react-icons/bs";

export default function BasketButton() {
  return (
    <Link href="/pushtest">
      <button className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm">
        <BsFillBasket3Fill size={25} color="var(--foreground)" />
      </button>
    </Link>
  )
}