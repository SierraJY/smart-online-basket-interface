//상세 목록 페이지 (서버)

import ProductDetailClient from './ProductDetailClient'

// generateStaticParams 제거 - 동적 라우팅으로 변경
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // id만 넘김, 실제 데이터 fetch는 클라이언트 컴포넌트에서 처리
  return <ProductDetailClient id={id} />
}