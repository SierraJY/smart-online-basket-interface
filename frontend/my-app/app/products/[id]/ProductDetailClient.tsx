//상세 목록 페이지 (클라이언트)

'use client'

import { useState } from 'react';
import { useAuth } from '@/utils/hooks/useAuth';
import { useFavorite } from '@/utils/hooks/useFavorite';
import { useProducts } from '@/utils/hooks/useProducts';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import Image from 'next/image';

export default function ProductDetailClient({ id }: { id: string }) {
  const { isLoggedIn, accessToken } = useAuth();
  const { products, loading, error } = useProducts();
  const product = products.find((p: any) => String(p.id) === String(id));
  const token = accessToken;
  const {
    favoriteList,
    addFavorite,
    removeFavorite,
  } = useFavorite(token);
  const [FavoriteLoading, setFavoriteLoading] = useState<boolean>(false);

  // 찜 토글 (React Query)
  const handleToggleFavorite = async (productId: number) => {
    if (!isLoggedIn || !token) {
      alert('로그인 후 이용 가능합니다.')
      return
    }
    setFavoriteLoading(true)
    try {
      if (favoriteList.includes(productId)) {
        await removeFavorite({ productId, token })
      } else {
        await addFavorite({ productId, token })
      }
    } catch (err: any) {
      alert(err.message || "찜 처리 오류")
    } finally {
      setFavoriteLoading(false)
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div>로딩 중...</div></main>
  }
  if (error || !product) {
    return <main className="min-h-screen flex items-center justify-center">
      <div>상품을 찾을 수 없습니다</div>
    </main>
  }

  // 카테고리 언더바를 슬래쉬로 치환
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/');

  return (
    <main
      className="min-h-screen flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="relative w-screen max-w-[540px] h-[32vh] sm:h-[280px] mx-auto overflow-hidden rounded-b-2xl">
        <Image
          src={product.imageUrl}
          alt={product.name}
          layout="fill"
          objectFit="cover"
          style={{
            objectPosition: 'center top',
            transition: 'filter 0.7s',
            filter: 'brightness(0.96) saturate(1.08)'
          }}
        />
      </div>
      {/* 상세정보 영역 */}
      <div
        className="w-full max-w-[540px] -mt-5 px-6 pt-7 pb-75 rounded-2xl shadow-xl relative z-10"
        style={{
          background: 'var(--footer-background)',
          border: '1.5px solid var(--footer-border)',
          marginBottom: 24,
          boxShadow: '0 6px 32px 0 rgba(0,0,0,0.09)',
          backdropFilter: 'blur(10px) saturate(140%)',
          transition: 'background-color 1.6s, color 1.6s, border-color 1.6s'
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--foreground)' }}>
            {product.name}
          </h1>
          <button
            onClick={async () => {
              if (FavoriteLoading) return
              await handleToggleFavorite(product.id)
            }}
            className={`ml-4 text-lg px-2 py-2 rounded-full hover:scale-110 transition-all z-10 ${FavoriteLoading ? 'opacity-60 pointer-events-none' : ''}`}
            title={favoriteList.includes(product.id) ? '찜 해제' : '찜'}
            disabled={FavoriteLoading}
          >
            {favoriteList.includes(product.id)
              ? <FaHeart size={28} color="var(--foreground)" />
              : <FaRegHeart size={28} color="var(--foreground)" />
            }
          </button>
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          {product.price.toLocaleString()}원
        </p>
        <p className="text-md font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          {product.brand}
        </p>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          남은 재고 : {product.stock}
        </p>
        <p className="text-sm mb-4" style={{ color: '#34cd55', opacity: 0.8 }}>
          {replaceCategoryName(product.category)}
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {product.description}
        </p>
      </div>
    </main>
  )
}
