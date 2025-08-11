import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { config } from '@/config/env'
import { FavoriteRequest, FavoriteListResponse, FavoriteProduct } from '@/types'

// 에러 타입 정의
interface ApiError {
  status?: number;
  message?: string;
  [key: string]: unknown;
}

// 캐시 데이터 타입 정의
interface FavoriteCacheData {
  favoriteProducts: FavoriteProduct[];
  [key: string]: unknown;
}

export const fetchFavoriteList = async (token: string): Promise<FavoriteListResponse> => {
  if (!token || token.length === 0) {
    throw new Error('토큰이 없습니다. 로그인이 필요합니다.')
  }
  
  const res = await fetch(config.API_ENDPOINTS.FAVORITES_MY, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('찜 목록 불러오기 실패')
  return res.json()
}

export const addFavorite = async ({ productId, token }: FavoriteRequest) => {
  if (!token || token.length === 0) {
    throw new Error('토큰이 없습니다. 로그인이 필요합니다.')
  }
  
  const res = await fetch(`${config.API_ENDPOINTS.FAVORITES}/${productId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('찜 추가 실패')
  return res.json()
}

export const removeFavorite = async ({ productId, token }: FavoriteRequest) => {
  if (!token || token.length === 0) {
    throw new Error('토큰이 없습니다. 로그인이 필요합니다.')
  }
  
  const res = await fetch(`${config.API_ENDPOINTS.FAVORITES}/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('찜 해제 실패')
  return res.json()
}

export function useFavorite(token: string | null) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', token],
    queryFn: () => fetchFavoriteList(token!),
    enabled: !!token && token.length > 0,
    // 찜 목록은 자주 변경되므로 짧은 캐시 시간
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
    // 에러 발생 시 재시도 설정
    retry: (failureCount: number, error: ApiError) => {
      // 4xx 에러는 재시도하지 않음
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      // 최대 2번까지만 재시도
      return failureCount < 2;
    },
  })

  const add = useMutation({
    mutationFn: ({ productId, token }: { productId: number, token: string }) =>
      addFavorite({ productId, token }),
    onMutate: async ({ productId }) => {
      // Optimistic update: UI를 즉시 업데이트
      await queryClient.cancelQueries({ queryKey: ['favorites', token] })
      const previousFavorites = queryClient.getQueryData(['favorites', token])
      
      queryClient.setQueryData(['favorites', token], (old: FavoriteCacheData | undefined) => {
        if (!old?.favoriteProducts) return old
        return {
          ...old,
          favoriteProducts: [...old.favoriteProducts, { id: productId } as FavoriteProduct]
        }
      })
      
      return { previousFavorites }
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 상태로 롤백
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites', token], context.previousFavorites)
      }
    },
    onSettled: () => {
      // 성공/실패 관계없이 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['favorites', token] })
    },
  })

  const remove = useMutation({
    mutationFn: ({ productId, token }: { productId: number, token: string }) =>
      removeFavorite({ productId, token }),
    onMutate: async ({ productId }) => {
      // Optimistic update: UI를 즉시 업데이트
      await queryClient.cancelQueries({ queryKey: ['favorites', token] })
      const previousFavorites = queryClient.getQueryData(['favorites', token])
      
      queryClient.setQueryData(['favorites', token], (old: FavoriteCacheData | undefined) => {
        if (!old?.favoriteProducts) return old
        return {
          ...old,
          favoriteProducts: old.favoriteProducts.filter((p: FavoriteProduct) => p.id !== productId)
        }
      })
      
      return { previousFavorites }
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 상태로 롤백
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites', token], context.previousFavorites)
      }
    },
    onSettled: () => {
      // 성공/실패 관계없이 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['favorites', token] })
    },
  })

  return {
    favoriteList: data?.favoriteProducts?.map((p: FavoriteProduct) => p.id) || [],
    loading: isLoading,
    addFavorite: add.mutateAsync,
    removeFavorite: remove.mutateAsync,
  }
}
