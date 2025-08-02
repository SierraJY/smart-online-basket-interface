// 공통 타입 정의

// 기본 API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 사용자 관련 타입
export interface User {
  id: string;
  userId: string;
  gender?: number;
  age?: number;
}

// 인증 관련 타입
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export interface LoginRequest {
  userId: string;
  userPasswd: string;
}

export interface SignupRequest {
  userId: string;
  password: string;
  gender: number;
  age: number;
}

// 상품 관련 타입
export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  discountRate: number;
  sales: number;
  tag: string | null;
  location: string | null;
  description: string | null;
  brand: string;
  discountedPrice: number;
}

export interface ProductListResponse {
  products: Product[];
}

export interface ProductDetailResponse {
  product: Product;
}

// 장바구니 관련 타입
export interface BasketItem {
  product: Product;
  quantity: number;
  totalPrice: number;
}

export interface Basket {
  items: BasketItem[];
  totalCount: number;
  totalPrice: number;
}

export interface BasketActivationRequest {
  basketId: string;
}

// 찜 관련 타입
export interface FavoriteProduct {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

export interface FavoriteListResponse {
  favoriteProducts: FavoriteProduct[];
}

export interface FavoriteRequest {
  productId: number;
  token: string;
}

// 푸시 알림 관련 타입
export interface PushTokenRequest {
  pushToken: string;
}

// 검색 및 필터링 타입
export interface SearchOptions {
  keyword?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface ProductFilters {
  keyword: string;
  category: string;
  excludeOutOfStock: boolean;
}

// 페이지네이션 타입
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// UI 상태 타입
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

// 테마 관련 타입
export type Theme = 'light' | 'dark';

// SSE 관련 타입
export interface SSEConnectionState {
  isConnected: boolean;
  lastDataTime: number;
  reconnectAttempts: number;
  error: string | null;
}

// 에러 타입
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  originalError?: any;
}

// 컴포넌트 Props 타입
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

// API 엔드포인트 타입
export interface ApiEndpoints {
  // 장바구니 관련
  BASKET_STREAM: string;
  BASKET_START: string;
  BASKET_ITEMS: string;
  BASKET_CHECKOUT: string;
  
  // 상품 관련
  PRODUCTS: string;
  PRODUCTS_SEARCH: string;
  PRODUCTS_CATEGORY: string;
  
  // 찜 관련
  FAVORITES: string;
  FAVORITES_MY: string;
  
  // 인증 관련
  AUTH: string;
  AUTH_REFRESH: string;
  
  // 고객 관련
  CUSTOMERS: string;
  CUSTOMERS_LOGIN: string;
  CUSTOMERS_SIGNUP: string;
  CUSTOMERS_PROFILE: string;
  
  // 푸시 알림
  PUSH_REGISTER: string;
  
  // 영수증
  RECEIPTS: string;
  
  // EPC 맵
  EPC_MAPS_SCAN: string;
  
  // 결제
  PAYMENTS: string;
}

// 환경 설정 타입
export interface AppConfig {
  API_BASE_URL: string;
  API_ENDPOINTS: ApiEndpoints;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
} 