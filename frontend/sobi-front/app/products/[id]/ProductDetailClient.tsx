//상세 목록 페이지 (클라이언트)

'use client'

import { useProducts } from '@/utils/hooks/useProducts';
import { useAuth } from '@/utils/hooks/useAuth';
import FavoriteIcon from '@/components/FavoriteIcon';
import Image from 'next/image';
import Link from 'next/link';

export default function ProductDetailClient({ id }: { id: string }) {
  const { products, loading, error } = useProducts();
  const { isGuestUser } = useAuth();
  const product = products.find((p) => String(p.id) === String(id));

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
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
    <main className="pb-20 min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}>
      {/* 모바일: 전체 화면 이미지 */}
      <div className="block md:hidden">
        <div className="relative w-full h-[45vh] overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            style={{
              objectPosition: 'center center',
              transition: 'filter 0.7s',
              filter: product.stock === 0 
                ? 'brightness(0.96) saturate(1.08) grayscale(100%)' 
                : 'brightness(0.96) saturate(1.08)'
            }}
            priority
            sizes="100vw"
            quality={85}
          />
          
          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        </div>
      </div>

      {/* 데스크탑: 중앙 카드 레이아웃 */}
      <div className="hidden md:flex justify-center items-start pt-8 pb-6 px-4">
        <div className="max-w-4xl w-full">
          {/* 이미지와 정보를 나란히 배치 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 이미지 영역 */}
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                style={{
                  transition: 'filter 0.7s',
                  filter: product.stock === 0 
                    ? 'brightness(0.96) saturate(1.08) grayscale(100%)' 
                    : 'brightness(0.96) saturate(1.08)'
                }}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={85}
              />
            </div>

            {/* 정보 영역 */}
            <div className="flex flex-col justify-start">
              {/* 상품명 및 찜 버튼 */}
              <div className="mb-6 flex justify-between items-start">
                <h1 className="text-3xl font-bold text-[var(--foreground)] flex-1 leading-tight">
                  {product.name}
                </h1>
                {!isGuestUser && (
                  <div className="ml-4 flex-shrink-0">
                    <FavoriteIcon productId={product.id} readOnly={false} />
                  </div>
                )}
              </div>
                
              {/* 태그 영역 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/products/tag?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium hover:scale-105 transition-transform cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, var(--sobi-green) 0%',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(66, 184, 131, 0.3)'
                      }}
                    >
                      {tag.replace('#', '# ')}
                    </Link>
                  ))}
                </div>
              )}

              {/* 가격 정보 */}
              <div className="mb-6">
                {product.discountRate && product.discountRate > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xl text-[var(--text-secondary)] line-through opacity-70">
                        {product.price.toLocaleString()}원
                      </p>
                      <p className="text-4xl font-bold text-[var(--foreground)]">
                        {Math.floor(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
                      </p>
                    </div>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {product.discountRate}% 할인
                    </span>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-[var(--foreground)]">
                    {product.price.toLocaleString()}원
                  </p>
                )}
              </div>

              {/* 상품 정보 요약 */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-[var(--text-secondary)]">브랜드</span>
                  <span className="font-semibold text-[var(--foreground)] text-lg">{product.brand}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-[var(--text-secondary)]">장소</span>
                  <span className="font-semibold text-[var(--foreground)] text-lg">{product.location || '정보 없음'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-[var(--text-secondary)]">카테고리</span>
                  <Link 
                    href={`/products/category?category=${encodeURIComponent(product.category)}`}
                    className="font-medium hover:scale-105 transition-transform cursor-pointer text-lg"
                    style={{ color: 'var(--sobi-green)' }}
                  >
                    {replaceCategoryName(product.category)}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-[var(--text-secondary)]">재고</span>
                  <span className={`font-semibold text-lg ${product.stock === 0 ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                    {product.stock === 0 ? '재고없음' : `${product.stock}개`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 상품 설명 - 전체 너비 */}
          {product.description && product.description !== '(NULL)' ? (
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: 'var(--sobi-green)' }}></div>
                상품 설명
              </h3>
              <div className="text-lg leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          ) : (
            <div className="mt-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                  상세설명 준비 중
                  <span className="inline-block ml-1">
                    <span className="animate-dots">.</span>
                    <span className="animate-dots" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-dots" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                </h3>
                <p className="text-base text-[var(--text-secondary)]">
                  곧 더 자세한 정보를 제공해드릴게요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일: 상세정보 영역 */}
      <div className="block md:hidden">
        <div className="relative rounded-2xl z-10 bg-[var(--footer-background)] backdrop-blur-xs border border-[var(--footer-border)]">
          <div className="p-6">
            {/* 상품명 및 찜 버튼 */}
            <div className="mb-6 flex justify-between items-start">
              <h1 className="text-2xl font-bold text-[var(--foreground)] flex-1 leading-tight">
                {product.name}
              </h1>
              {!isGuestUser && (
                <div className="ml-4 flex-shrink-0">
                  <FavoriteIcon productId={product.id} readOnly={false} />
                </div>
              )}
            </div>
              
            {/* 태그 영역 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/products/tag?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium hover:scale-105 transition-transform cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, var(--sobi-green) 0%',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(66, 184, 131, 0.3)'
                    }}
                  >
                    {tag.replace('#', '# ')}
                  </Link>
                ))}
              </div>
            )}

            {/* 가격 정보 */}
            <div className="mb-6">
              {product.discountRate && product.discountRate > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-lg text-[var(--text-secondary)] line-through opacity-70">
                      {product.price.toLocaleString()}원
                    </p>
                    <p className="text-3xl font-bold text-[var(--foreground)]">
                      {Math.floor(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
                    </p>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {product.discountRate}% 할인
                  </span>
                </div>
              ) : (
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {product.price.toLocaleString()}원
                </p>
              )}
            </div>

            {/* 상품 정보 요약 */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base text-[var(--text-secondary)]">브랜드</span>
                <span className="font-semibold text-[var(--foreground)] text-base">{product.brand}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-[var(--text-secondary)]">장소</span>
                <span className="font-semibold text-[var(--foreground)] text-base">{product.location || '정보 없음'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-[var(--text-secondary)]">카테고리</span>
                <Link 
                  href={`/products/category?category=${encodeURIComponent(product.category)}`}
                  className="font-medium hover:scale-105 transition-transform cursor-pointer text-base"
                  style={{ color: 'var(--sobi-green)' }}
                >
                  {replaceCategoryName(product.category)}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-[var(--text-secondary)]">재고</span>
                <span className={`font-semibold text-base ${product.stock === 0 ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                  {product.stock === 0 ? '재고없음' : `${product.stock}개`}
                </span>
              </div>
            </div>

            {/* 상품 설명 */}
            {product.description && product.description !== '(NULL)' ? (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--sobi-green)' }}></div>
                  상품 설명
                </h3>
                <div className="text-base leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    상세설명 준비 중
                    <span className="inline-block ml-1">
                      <span className="animate-dots">.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.4s' }}>.</span>
                    </span>
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    곧 더 자세한 정보를 제공해드릴게요
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
