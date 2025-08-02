// 찜 목록 페이지

'use client'

import Link from "next/link";
import Image from "next/image";
import { FaHeart, FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from '@/utils/hooks/useAuth'
import { useFavorite } from "@/utils/hooks/useFavorite";
import { useProducts, Product } from "@/utils/hooks/useProducts";

export default function FavoritePage() {
  // 로그인 상태 및 토큰
  const { isLoggedIn, accessToken: token } = useAuth()

  // 찜한 상품 ID 배열과 상태들만 가져옴
  const {
    favoriteList,   // ex: [1, 5, 8]
    loading,
    removeFavorite,
  } = useFavorite(token);

  // 전체 상품 정보 (상품 id 매칭해서 실제 상품 데이터 보여줌)
  const { products, loading: productsLoading, error: productsError } = useProducts();

  // 실제 찜한 상품 정보 리스트 만들기 (ID로 filter)
  const favoriteProducts = products.filter(
    (item: Product) => favoriteList.includes(item.id)
  );

  // 1. 로그인 필요
  if (!isLoggedIn || !token) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}>
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">로그인이 필요합니다!</div>
      <Link
        href="/login"
        className="inline-block px-6 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-full shadow hover:bg-neutral-700 transition-all"
      >
        로그인 하러가기
      </Link>
    </div>
  );

  // 2. 로딩
  if (loading || productsLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}>
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">찜 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );

  // 3. 에러 (찜/상품 둘 다 체크)
  if (productsError) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}>
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
      <div className="text-gray-500 dark:text-gray-300 text-base mb-4">{productsError.message || String(productsError)}</div>
      <button
        className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );

  // 4. 비어있는 경우
  if (!favoriteProducts || favoriteProducts.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}>
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

  // 5. 실제 찜목록 렌더링
  return (
    <main
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h2 className="text-2xl font-bold mb-8 mt-4" style={{ color: 'var(--foreground)' }}>
        내 찜 목록
      </h2>
      <ul className="w-full max-w-2xl">
        {favoriteProducts.map((item: Product) => (
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
                style={{ backgroundColor: 'var(--input-background)', minWidth: 80 }}
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
                {item.brand && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.brand}</div>
                )}
              </div>
            </Link>
            {/* 찜 해제 버튼 */}
            <button
              onClick={() => removeFavorite({ productId: item.id, token })}
              className="ml-2 text-red-600 dark:text-red-400 text-xl hover:scale-110 transition-all"
              // removeLoading 기능 있으면 적용 (useFavorite에 구현돼있으면)
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
