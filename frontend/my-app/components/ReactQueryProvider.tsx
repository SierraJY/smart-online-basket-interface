// React Query 영역 지정용 페이지

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  // 클라이언트에서만 상태 생성
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}