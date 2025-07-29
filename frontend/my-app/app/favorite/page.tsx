'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaHeart, FaExclamationTriangle } from "react-icons/fa";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchFavoriteList, removeFavorite } from "@/utils/api/favorite";

type Product = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  brand?: string;
  [key: string]: any;
};

export default function FavoritePage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [favorite, setFavorite] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // 찜목록 조회
  useEffect(() => {
    if (!accessToken) {
      setError("로그인이 필요합니다!");
      setLoading(false);
      return;
    }
    fetchFavoriteList(accessToken)
      .then((data) => {
        setFavorite(data.favoriteProducts || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "찜 목록을 불러오지 못했습니다.");
        setLoading(false);
      });
  }, [accessToken]);

  // 찜 해제
  const handleRemove = async (productId: number) => {
    if (!accessToken || removeLoading) return;
    setRemoveLoading(true);
    try {
      await removeFavorite(productId, accessToken);
      setFavorite((prev) => prev.filter((item) => item.id !== productId));
    } catch (e: any) {
      alert(e?.message || "찜 해제 실패!");
    } finally {
      setRemoveLoading(false);
    }
  };

  // 로딩 UI (다크모드 대응)
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">찜 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );

  // 에러 UI (다크모드 대응)
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
    >
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
      <div className="text-gray-500 dark:text-gray-300 text-base mb-4">{error}</div>
      <button
        className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );

  // 빈 상태 UI (다크모드 대응)
  if (!favorite.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
    >
      <FaHeart size={56} className="mb-4 text-gray-300 dark:text-gray-700 animate-pulse" />
      <div className="font-semibold text-lg text-[var(--foreground)] mb-2">찜한 상품이 없습니다!</div>
      <div className="text-sm text-gray-400 mb-6">
        마음에 드는 상품에 <FaHeart className="inline mb-1 text-red-400" />를 눌러 찜해보세요.
      </div>
      <Link
        href="/products"
        className="inline-block px-6 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-full shadow hover:bg-neutral-700 transition-all"
      >
        상품 전체 보기
      </Link>
    </div>
  );

  // 실제 찜 목록 렌더링 (디자인만 예쁘게, 기능은 최신)
  return (
    <main
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h2 className="text-2xl font-bold mb-8 mt-4" style={{ color: 'var(--foreground)' }}>
        내 찜 목록
      </h2>
      <ul className="w-full max-w-2xl">
        {favorite.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-4 mb-6 border-b border-[var(--input-border)] pb-5 relative group hover:bg-[var(--background)] rounded-2xl transition-colors"
          >
            <Link href={`/products/${item.id}`} className="flex items-center gap-4 flex-1 min-w-0">
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-xl bg-[var(--input-background)]"
                style={{ background: 'var(--input-background)', minWidth: 80 }}
                priority
              />
              <div className="min-w-0">
                <div
                  className="font-semibold truncate text-[var(--foreground)]"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '40px',
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {item.price?.toLocaleString?.() || item.price}원
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.brand}</div>
              </div>
            </Link>
            {/* 찜 해제 버튼 */}
            <button
              onClick={() => handleRemove(item.id)}
              className="ml-2 text-red-600 dark:text-red-400 text-xl hover:scale-110 transition-all"
              disabled={removeLoading}
              title="찜 해제"
            >
              <FaHeart size={27} />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
