// 찜 목록 페이지

'use client';
import { useEffect, useState } from 'react';
import { fetchFavorite } from '@/utils/FavoriteUtils';
import { useAuthStore } from '@/store/useAuthStore'; // accessToken 가져오는 훅/스토어 예시

export default function FavoritePage() {
  const accessToken = useAuthStore((state) => state.accessToken); // 행님 프로젝트에 맞춰서 가져와!
  const [Favorite, setFavorite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError('로그인이 필요합니다!');
      setLoading(false);
      return;
    }
    fetchFavorite(accessToken)
      .then((data) => {
        setFavorite(data.favoriteProducts);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [accessToken]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!Favorite.length) return <div>찜한 상품이 없습니다.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">내 찜 목록</h2>
      <ul>
        {Favorite.map((item) => (
          <li key={item.id} className="flex items-center gap-4 mb-4 border-b pb-4">
            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded" />
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-500">{item.price.toLocaleString()}원</div>
              <div className="text-xs text-gray-400">{item.brand}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}