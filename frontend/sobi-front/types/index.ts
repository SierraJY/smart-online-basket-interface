// 공통 타입 정의

// React 타입 정의 (React import 문제 해결)
export type ReactNode = string | number | boolean | null | undefined | object;

// React 이벤트 타입들
export interface FormEvent extends Event {
  target: EventTarget & HTMLFormElement;
}

export interface ChangeEvent<T = Element> extends Event {
  target: EventTarget & T;
}

export interface MouseEvent extends Event {
  clientX: number;
  clientY: number;
}

export interface KeyboardEvent extends Event {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// 기본 API 응답 타입
export interface ApiResponse<T> {
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

export interface GuestLoginResponse {
  customerId: number;
  message: string;
  accessToken: string;
  userId: string;
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
  tag: string;
  location: string | null;
  description: string | null;
  brand: string | null;
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
  epcPattern: string;
  quantity: number;
  product: Product | null;
  totalPrice: number;
}

export interface Basket {
  items: BasketItem[];
  totalCount: number;
  totalPrice: number;
  boardMac?: string;
  timestamp?: number;
  recommendations?: Product[];
}

export interface BasketData {
  items: BasketItem[];
  totalPrice: number;
  totalCount: number;
  boardMac: string;
  timestamp: number;
  recommendations: Product[];
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

// 로딩 상태 타입
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// 모달 상태 타입
export interface ModalState<T = unknown> {
  isOpen: boolean;
  data?: T;
}

// 테마 타입
export type Theme = 'light' | 'dark';

// SSE 연결 상태 타입
export interface SSEConnectionState {
  isConnected: boolean;
  lastDataTime: number;
  reconnectAttempts: number;
  error: string | null;
}

// 장바구니 업데이트 이벤트 타입
export interface BasketUpdateEvent {
  type: 'basket-initial' | 'basket-update';
  data: Basket;
  timestamp: number;
}

// SSE 이벤트 데이터 타입
export interface SSEEventData {
  event: string;
  data: BasketUpdateEvent;
}

// 전역 장바구니 상태 타입
export interface GlobalBasketState {
  basketData: Basket | null;
  isConnected: boolean;
  lastUpdate: number;
  error: string | null;
  reconnectAttempts: number;
}

// 에러 타입
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  originalError?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  status?: number;
  code?: string;
}

// 컴포넌트 Props 타입
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
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

// 앱 설정 타입
export interface AppConfig {
  API_BASE_URL: string;
  API_ENDPOINTS: ApiEndpoints;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

// 성능 메타데이터 타입
export interface PerformanceMetadata {
  componentName?: string;
  action?: string;
  timestamp?: number;
  [key: string]: string | number | boolean | undefined;
}

// 기본 타입 가드 함수들
export function isBasket(data: unknown): data is Basket {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'totalCount' in data &&
    'totalPrice' in data
  );
}

export function isProduct(data: unknown): data is Product {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'price' in data &&
    'stock' in data
  );
}

export function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as ApiResponse<T>).success === 'boolean'
  );
}
