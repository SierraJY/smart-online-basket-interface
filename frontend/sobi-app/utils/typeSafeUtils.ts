// 타입 안전한 유틸리티 함수들

import { 
  isString, 
  isNumber, 
  isArray, 
  isObject, 
  isError
} from '../types/advanced';

// hasProperty 타입 가드 함수 추가
function hasProperty<T extends object, K extends PropertyKey>(
  obj: T, 
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj;
}

// 타입 안전한 로컬 스토리지
export class SafeLocalStorage {
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }
}

// 타입 안전한 세션 스토리지
export class SafeSessionStorage {
  static getItem<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
    }
  }

  static removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static clear(): void {
    sessionStorage.clear();
  }
}

// 타입 안전한 쿠키 관리
export class SafeCookieManager {
  static get<T>(name: string): T | null {
    try {
      const value = document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
      
      return value ? JSON.parse(decodeURIComponent(value)) : null;
    } catch {
      return null;
    }
  }

  static set<T>(name: string, value: T, options: {
    expires?: Date | number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}): void {
    try {
      let cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}`;
      
      if (options.expires) {
        const expires = options.expires instanceof Date ? options.expires : new Date(options.expires);
        cookie += `; expires=${expires.toUTCString()}`;
      }
      
      if (options.path) cookie += `; path=${options.path}`;
      if (options.domain) cookie += `; domain=${options.domain}`;
      if (options.secure) cookie += '; secure';
      if (options.sameSite) cookie += `; samesite=${options.sameSite}`;
      
      document.cookie = cookie;
    } catch (error) {
      console.error('Failed to set cookie:', error);
    }
  }

  static remove(name: string, path?: string): void {
    this.set(name, null, { 
      expires: new Date(0),
      path: path || '/'
    });
  }
}

// 타입 안전한 URL 파라미터 처리
export class SafeUrlParams {
  static buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    return searchParams.toString();
  }

  static parseQueryString(queryString: string): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    const searchParams = new URLSearchParams(queryString);
    
    for (const [key, value] of searchParams.entries()) {
      // 숫자로 변환 가능한지 확인
      const numValue = Number(value);
      if (!isNaN(numValue) && value !== '') {
        params[key] = numValue;
      } else if (value === 'true' || value === 'false') {
        params[key] = value === 'true';
      } else {
        params[key] = value;
      }
    }
    
    return params;
  }

  static getUrlParam(name: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  static setUrlParam(name: string, value: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url.toString());
  }

  static removeUrlParam(name: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
  }
}

// 타입 안전한 폼 검증
export class SafeFormValidator {
  static validateRequired(value: unknown): boolean {
    if (isString(value)) return value.trim().length > 0;
    if (isNumber(value)) return !isNaN(value);
    if (isArray(value)) return value.length > 0;
    if (isObject(value)) return Object.keys(value).length > 0;
    return false;
  }

  static validateEmail(value: unknown): boolean {
    if (!isString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  static validateMinLength(value: unknown, minLength: number): boolean {
    if (!isString(value)) return false;
    return value.length >= minLength;
  }

  static validateMaxLength(value: unknown, maxLength: number): boolean {
    if (!isString(value)) return false;
    return value.length <= maxLength;
  }

  static validateRange(value: unknown, min: number, max: number): boolean {
    if (!isNumber(value)) return false;
    return value >= min && value <= max;
  }

  static validatePattern(value: unknown, pattern: RegExp): boolean {
    if (!isString(value)) return false;
    return pattern.test(value);
  }

  static validateCustom<T>(
    value: T,
    validator: (value: T) => boolean | string
  ): boolean | string {
    return validator(value);
  }
}

// 타입 안전한 에러 처리
export class SafeErrorHandler {
  static isNetworkError(error: unknown): boolean {
    return isError(error) && (
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('ERR_NETWORK')
    );
  }

  static isApiError(error: unknown): boolean {
    return isError(error) && (
      error.message.includes('API Error') ||
      error.message.includes('HTTP Error') ||
      hasProperty(error, 'status') ||
      hasProperty(error, 'code')
    );
  }

  static isValidationError(error: unknown): boolean {
    return isError(error) && (
      error.message.includes('Validation') ||
      error.message.includes('Invalid') ||
      hasProperty(error, 'validationErrors')
    );
  }

  static getErrorMessage(error: unknown): string {
    if (isError(error)) {
      return error.message;
    }
    if (isString(error)) {
      return error;
    }
    if (isObject(error) && hasProperty(error, 'message') && isString(error.message)) {
      return error.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
  }

  static getErrorCode(error: unknown): string | null {
    if (isObject(error) && hasProperty(error, 'code') && isString(error.code)) {
      return error.code;
    }
    if (isObject(error) && hasProperty(error, 'status') && isNumber(error.status)) {
      return String(error.status);
    }
    return null;
  }
}

// 타입 안전한 디바운스/쓰로틀
export class SafeDebounceThrottle {
  private static timeouts = new Map<string, NodeJS.Timeout>();
  private static throttles = new Map<string, boolean>();

  static debounce<T extends (...args: unknown[]) => unknown>(
    key: string,
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, wait);
      
      this.timeouts.set(key, timeout);
    };
  }

  static throttle<T extends (...args: unknown[]) => unknown>(
    key: string,
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (!this.throttles.get(key)) {
        func(...args);
        this.throttles.set(key, true);
        setTimeout(() => {
          this.throttles.delete(key);
        }, limit);
      }
    };
  }

  static clear(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
    this.throttles.delete(key);
  }

  static clearAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.throttles.clear();
  }
}

// 타입 안전한 메모이제이션
export class SafeMemoization {
  private static cache = new Map<string, { value: unknown; timestamp: number; ttl?: number }>();

  static memoize<T>(
    key: string,
    fn: () => T,
    ttl?: number // Time to live in milliseconds
  ): T {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (!ttl || (now - cached.timestamp) < ttl)) {
      return cached.value as T;
    }
    
    const result = fn();
    this.cache.set(key, { value: result, timestamp: now, ttl });
    return result;
  }

  static clear(key: string): void {
    this.cache.delete(key);
  }

  static clearAll(): void {
    this.cache.clear();
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}

// 타입 안전한 재시도 로직
export class SafeRetry {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts: number;
      delay: number;
      backoff?: 'linear' | 'exponential';
      onRetry?: (attempt: number, error: unknown) => void;
    }
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }
        
        if (attempt === options.maxAttempts) {
          throw lastError;
        }
        
        const delay = options.backoff === 'exponential' 
          ? options.delay * Math.pow(2, attempt - 1)
          : options.delay * attempt;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// 타입 안전한 타임아웃
export class SafeTimeout {
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage?: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }
}

// 타입 안전한 병렬 처리
export class SafeParallel {
  static async map<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      chunks.push(items.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item, index) => mapper(item, index))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  static async forEach<T>(
    items: T[],
    action: (item: T, index: number) => Promise<void>,
    concurrency: number = 5
  ): Promise<void> {
    const chunks = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      chunks.push(items.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((item, index) => action(item, index))
      );
    }
  }
}
