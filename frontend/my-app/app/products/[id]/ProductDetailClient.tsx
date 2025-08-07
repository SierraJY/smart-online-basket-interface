//상세 목록 페이지 (클라이언트)

'use client'

import { useAuth } from '@/utils/hooks/useAuth';
import { useProducts } from '@/utils/hooks/useProducts';
import FavoriteIcon from '@/components/FavoriteIcon';
import Image from 'next/image';
import { Tag } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailClient({ id }: { id: string }) {
  const { products, loading, error } = useProducts();
  const product = products.find((p: any) => String(p.id) === String(id));

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">상품 정보를 불러오는 중...</p>
        </div>
      </main>
    )
  }
  
  if (error || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-[var(--foreground)] mb-4">상품을 찾을 수 없습니다</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[var(--sobi-green)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            뒤로 가기
          </button>
        </div>
      </main>
    )
  }

  // 카테고리 언더바를 슬래쉬로 치환
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/');

  // 태그 파싱 함수
  const parseTags = (tagString: string) => {
    if (!tagString) return [];
    return tagString.split(' ').filter(tag => tag.startsWith('#'));
  };

  const tags = parseTags(product.tag || '');

  return (
    <main className="pb-24 min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}>
      {/* 상품 이미지 영역 */}
      <div className="relative w-full h-[45vh] sm:h-[400px] overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          style={{
            objectPosition: 'center top',
            transition: 'filter 0.7s',
            filter: product.stock === 0 
              ? 'brightness(0.96) saturate(1.08) grayscale(100%)' 
              : 'brightness(0.96) saturate(1.08)'
          }}
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
          quality={85}
        />
        
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        

      </div>

      {/* 상세정보 영역 */}
      <div className="relative -mt-8 mx-4 rounded-2xl z-10 bg-[var(--footer-background)] backdrop-blur-xs border border-[var(--footer-border)]">
        <div className="p-6">
          {/* 상품명 및 찜 버튼 */}
          <div className="mb-4 flex justify-between items-start">
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 flex-1">
              {product.name}
            </h1>
            <div className="ml-4">
              <FavoriteIcon productId={product.id} readOnly={false} />
            </div>
          </div>
            
            {/* 태그 영역 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/products/tag?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium hover:scale-105 transition-transform cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, var(--sobi-green) 0%, rgba(66, 184, 131, 0.8) 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(66, 184, 131, 0.3)'
                    }}
                  >
                    {/* <Tag size={12} className="mr-1" /> */}
                    {tag.replace('#', '# ')}
                  </Link>
                ))}
              </div>
            )}

          {/* 가격 및 브랜드 */}
          <div className="mb-4">
            {product.discountRate && product.discountRate > 0 ? (
              <div className="mb-2">
                {/* 원가 (취소선) */}
                <p className="text-lg text-[var(--text-secondary)] line-through mb-1">
                  {product.price.toLocaleString()}원
                </p>
                {/* 할인가 */}
                <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
                  {Math.floor(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
                </p>
                {/* 할인율 */}
                <span 
                  className="inline-block px-2 py-1 rounded-md text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {product.discountRate}%
                </span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
                {product.price.toLocaleString()}원
              </p>
            )}
            <p className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {product.brand}
            </p>
          </div>

          {/* 카테고리 및 재고 */}
          <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              남은 재고: <span className="font-semibold text-[var(--foreground)]">{product.stock}</span>
            </p>
            <Link 
              href={`/products/category?category=${encodeURIComponent(product.category)}`}
              className="inline-block text-sm font-medium hover:scale-105 transition-transform cursor-pointer"
              style={{ color: 'var(--sobi-green)' }}
            >
              {replaceCategoryName(product.category)}
            </Link>
          </div>

          {/* 상품 설명 */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">상품 설명</h3>
            {product.description && product.description !== '(NULL)' ? (
              <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                {product.description}
              </p>
            ) : (
              <span 
                className="block w-full py-3 px-4 font-semibold transition-all duration-200 text-center text-2xl"
              >
                상세설명 준비 중
                <span className="inline-block ml-1">
                  <span className="animate-dots">.</span>
                  <span className="animate-dots" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-dots" style={{ animationDelay: '0.4s' }}>.</span>
                  <span className="animate-dots" style={{ animationDelay: '0.6s' }}>.</span>
                  <span className="animate-dots" style={{ animationDelay: '0.8s' }}>.</span>
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
