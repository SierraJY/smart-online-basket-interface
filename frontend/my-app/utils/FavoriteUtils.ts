export async function fetchFavorite(accessToken: string) {
  const res = await fetch('/api/favorites/my', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 필요 없으면 빼도 됨
  });
  if (!res.ok) throw new Error('찜 목록 조회 실패');
  return await res.json(); // 반환값: { favoriteProducts: [...], ... }
}