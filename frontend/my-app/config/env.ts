// 환경 변수 설정
export const config = {
  // API 서버 설정
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://13.125.215.242:8082',
  API_PORT: process.env.NEXT_PUBLIC_API_PORT || '8082',
  
  // 프론트엔드 서버 설정
  FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || '8080',
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://13.125.215.242:8080',
  
  // 개발 환경 설정
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // API 엔드포인트
  get API_ENDPOINTS() {
    return {
      // 장바구니 관련
      BASKET_STREAM: `${this.API_BASE_URL}/api/baskets/my/stream`,
      BASKET_START: `${this.API_BASE_URL}/api/baskets/start`,
      BASKET_ITEMS: `${this.API_BASE_URL}/api/baskets/my/items`,
      BASKET_CHECKOUT: `${this.API_BASE_URL}/api/baskets/my/checkout`,
      
      // 상품 관련
      PRODUCTS: `${this.API_BASE_URL}/api/products`,
      PRODUCTS_SEARCH: `${this.API_BASE_URL}/api/products/search`,
      PRODUCTS_CATEGORY: `${this.API_BASE_URL}/api/products/category`,
      
      // 찜 관련
      FAVORITES: `${this.API_BASE_URL}/api/favorites`,
      FAVORITES_MY: `${this.API_BASE_URL}/api/favorites/my`,
      
      // 인증 관련
      AUTH: `${this.API_BASE_URL}/api/auth`,
      AUTH_REFRESH: `${this.API_BASE_URL}/api/auth/refresh`,
      
      // 고객 관련
      CUSTOMERS: `${this.API_BASE_URL}/api/customers`,
      CUSTOMERS_LOGIN: `${this.API_BASE_URL}/api/customers/login`,
      CUSTOMERS_SIGNUP: `${this.API_BASE_URL}/api/customers/signup`,
      CUSTOMERS_PROFILE: `${this.API_BASE_URL}/api/customers/profile`,
      
      // 푸시 알림
      PUSH_REGISTER: `${this.API_BASE_URL}/api/push/register`,
      
      // 영수증
      RECEIPTS: `${this.API_BASE_URL}/api/receipts/my`,
      
      // EPC 맵
      EPC_MAPS_SCAN: `${this.API_BASE_URL}/api/epc-maps/scan`,

      // 결제
      PAYMENTS: `${this.API_BASE_URL}/api/baskets/my/checkout`,
    };
  }
}; 