//상세 목록 페이지 (서버)

import ProductDetailClient from './ProductDetailClient'
import products from '@/public/products.json'

export function generateStaticParams() {
  // products.json의 모든 id를 path로 리턴
  return products.map((p: { id: number }) => ({
    id: String(p.id),
  }))
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // id만 넘김, 실제 데이터 fetch는 클라이언트 컴포넌트에서 처리
  return <ProductDetailClient id={id} />
}