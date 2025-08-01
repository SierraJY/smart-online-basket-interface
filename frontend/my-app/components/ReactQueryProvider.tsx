// React Query 영역 지정용 페이지

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  // 클라이언트에서만 상태 생성
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 stale time을 5분으로 설정 (불필요한 refetch 방지)
        staleTime: 5 * 60 * 1000,
        // 기본 cache time을 10분으로 설정
        gcTime: 10 * 60 * 1000,
        // 재시도 횟수 제한
        retry: (failureCount, error: any) => {
          // 4xx 에러는 재시도하지 않음
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // 최대 3번까지만 재시도
          return failureCount < 3;
        },
        // 네트워크 재연결 시 자동 refetch
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // 에러 발생 시 자동 refetch 비활성화
        refetchOnMount: true,
      },
      mutations: {
        // mutation 재시도 비활성화
        retry: false,
        // mutation 실패 시 에러 처리
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  }))

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}