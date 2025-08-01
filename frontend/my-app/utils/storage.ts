// localStorage 접근 최적화 래퍼

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  THEME: 'theme',
  BASKET_ID: 'basketId',
  ACTIVATED_BASKET_ID: 'activatedBasketId',
  BASKET_STORAGE: 'basket-storage',
  AUTH_STORAGE: 'auth-storage',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * 안전한 localStorage 접근을 위한 래퍼
 */
export const storage = {
  /**
   * localStorage에서 값 가져오기
   */
  get: (key: StorageKey): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[Storage] Failed to get ${key}:`, error);
      return null;
    }
  },

  /**
   * localStorage에 값 저장하기
   */
  set: (key: StorageKey, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`[Storage] Failed to set ${key}:`, error);
    }
  },

  /**
   * localStorage에서 값 제거하기
   */
  remove: (key: StorageKey): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Failed to remove ${key}:`, error);
    }
  },

  /**
   * 여러 키를 한번에 제거하기
   */
  removeMultiple: (keys: StorageKey[]): void => {
    keys.forEach(key => storage.remove(key));
  },

  /**
   * 인증 관련 데이터 전체 제거
   */
  clearAuth: (): void => {
    storage.removeMultiple([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_ID,
    ]);
  },

  /**
   * 장바구니 관련 데이터 전체 제거
   */
  clearBasket: (): void => {
    storage.removeMultiple([
      STORAGE_KEYS.BASKET_ID,
      STORAGE_KEYS.ACTIVATED_BASKET_ID,
      STORAGE_KEYS.BASKET_STORAGE,
    ]);
  },
};

/**
 * 인증 관련 storage 헬퍼
 */
export const authStorage = {
  getAccessToken: () => storage.get(STORAGE_KEYS.ACCESS_TOKEN),
  getRefreshToken: () => storage.get(STORAGE_KEYS.REFRESH_TOKEN),
  getUserId: () => storage.get(STORAGE_KEYS.USER_ID),
  
  setAccessToken: (token: string) => storage.set(STORAGE_KEYS.ACCESS_TOKEN, token),
  setRefreshToken: (token: string) => storage.set(STORAGE_KEYS.REFRESH_TOKEN, token),
  setUserId: (id: string) => storage.set(STORAGE_KEYS.USER_ID, id),
  
  clear: () => storage.clearAuth(),
  
  isLoggedIn: (): boolean => {
    return !!authStorage.getAccessToken();
  },
};

/**
 * 테마 관련 storage 헬퍼
 */
export const themeStorage = {
  get: () => storage.get(STORAGE_KEYS.THEME) as 'light' | 'dark' | null,
  set: (theme: 'light' | 'dark') => storage.set(STORAGE_KEYS.THEME, theme),
  remove: () => storage.remove(STORAGE_KEYS.THEME),
};

/**
 * 장바구니 관련 storage 헬퍼
 */
export const basketStorage = {
  getBasketId: () => storage.get(STORAGE_KEYS.BASKET_ID),
  getActivatedBasketId: () => storage.get(STORAGE_KEYS.ACTIVATED_BASKET_ID),
  
  setBasketId: (id: string) => storage.set(STORAGE_KEYS.BASKET_ID, id),
  setActivatedBasketId: (id: string) => storage.set(STORAGE_KEYS.ACTIVATED_BASKET_ID, id),
  
  clear: () => storage.clearBasket(),
}; 