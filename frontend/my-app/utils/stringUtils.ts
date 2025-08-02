// 문자열 처리 유틸리티 함수들

/**
 * 카테고리 이름에서 언더스코어를 슬래시로 변환
 * @param cat 카테고리 이름
 * @returns 변환된 카테고리 이름
 */
export const replaceCategoryName = (cat: string): string => {
  return cat.replace(/_/g, '/');
};

/**
 * 상품 배열에서 카테고리 목록 추출
 * @param products 상품 배열
 * @returns 카테고리 배열 (전체 포함, 중복 제거)
 */
export const extractCategories = (products: any[]): string[] => {
  if (!products || !Array.isArray(products)) {
    return ['전체'];
  }

  const categories = Array.from(
    new Set(
      products
        .map((p) => (p.category ?? '').trim())
        .filter((cat: string) => !!cat && cat.length > 0)
    )
  );

  return ['전체', ...categories];
};

/**
 * 텍스트 검색을 위한 키워드 정규화
 * @param keyword 검색 키워드
 * @returns 정규화된 키워드
 */
export const normalizeKeyword = (keyword: string): string => {
  return keyword.trim().toLowerCase();
};

/**
 * 가격을 한국어 형식으로 포맷팅
 * @param price 가격
 * @returns 포맷팅된 가격 문자열
 */
export const formatPrice = (price: number): string => {
  return price.toLocaleString() + '원';
};

/**
 * 할인가 계산
 * @param originalPrice 원가
 * @param discountRate 할인율 (%)
 * @returns 할인된 가격
 */
export const calculateDiscountedPrice = (originalPrice: number, discountRate: number): number => {
  return Math.round(originalPrice * (1 - discountRate / 100));
}; 