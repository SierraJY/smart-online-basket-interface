import axios from 'axios';

// 내 장바구니 상품 목록 가져오기
export async function fetchBasketProducts(boardMac: string) {
  const res = await axios.get(`/api/baskets/my?boardMac=${boardMac}`);
  return res.data.products; // API 명세에 따라 수정
}
