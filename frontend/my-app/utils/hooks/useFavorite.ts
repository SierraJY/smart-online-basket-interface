import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const fetchFavoriteList = async (token: string) => {
  const res = await fetch('/api/favorites/my', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('찜 목록 불러오기 실패')
  return res.json()
}

export const addFavorite = async ({ productId, token }: { productId: number, token: string }) => {
  const res = await fetch(`/api/favorites/${productId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('찜 추가 실패')
  return res.json()
}

export const removeFavorite = async ({ productId, token }: { productId: number, token: string }) => {
  const res = await fetch(`/api/favorites/${productId}`, {
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
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  })

  const add = useMutation({
    mutationFn: ({ productId, token }: { productId: number, token: string }) =>
      addFavorite({ productId, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', token] })
    },
  })

  const remove = useMutation({
    mutationFn: ({ productId, token }: { productId: number, token: string }) =>
      removeFavorite({ productId, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', token] })
    },
  })

  return {
    favoriteList: data?.favoriteProducts?.map((p: any) => p.id) || [],
    loading: isLoading,
    addFavorite: add.mutateAsync,
    removeFavorite: remove.mutateAsync,
  }
}
