// 성능 모니터링 유틸리티

import React from 'react';

// 환경별 설정
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  pageLoadTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

// 프로덕션용 핵심 메트릭 인터페이스
interface CoreMetrics {
  pageLoadTime: number;
  memoryUsage?: number;
  networkRequests: number;
  criticalErrors: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private pageLoadStartTime: number;
  private networkRequestCount: number = 0;
  private criticalErrors: number = 0;
  public isEnabled: boolean; // private에서 public으로 변경

  constructor() {
    this.pageLoadStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.isEnabled = typeof window !== 'undefined';
    
    // 브라우저 환경에서만 PerformanceObserver 설정
    if (this.isEnabled) {
      this.setupPerformanceObserver();
    }
  }

  /**
   * 성능 측정 시작
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      metadata
    });
  }

  /**
   * 성능 측정 종료
   */
  endMeasure(name: string): number | null {
    if (!this.isEnabled) return null;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      if (IS_DEVELOPMENT) {
        console.warn(`[Performance] 측정되지 않은 메트릭: ${name}`);
      }
      return null;
    }

    metric.endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    metric.duration = metric.endTime - metric.startTime;

    // 개발 환경에서만 상세 로깅
    if (IS_DEVELOPMENT) {
      console.log(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }
    
    return metric.duration;
  }

  /**
   * 페이지 로드 시간 측정
   */
  measurePageLoad(): number {
    if (!this.isEnabled) return 0;
    
    const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pageLoadTime = currentTime - this.pageLoadStartTime;
    
    // 개발 환경에서만 로깅
    if (IS_DEVELOPMENT) {
      console.log(`[Performance] 페이지 로드 시간: ${pageLoadTime.toFixed(2)}ms`);
    }
    
    return pageLoadTime;
  }

  /**
   * 메모리 사용량 측정 (브라우저 지원 시)
   */
  getMemoryUsage(): number | null {
    if (!this.isEnabled || typeof performance === 'undefined' || !('memory' in performance)) {
      return null;
    }
    
    const memory = (performance as any).memory;
    const usageMB = memory.usedJSHeapSize / 1024 / 1024;
    
    // 개발 환경에서만 로깅
    if (IS_DEVELOPMENT) {
      console.log(`[Performance] 메모리 사용량: ${usageMB.toFixed(2)}MB`);
    }
    
    return usageMB;
  }

  /**
   * 네트워크 요청 카운트 증가
   */
  incrementNetworkRequest(): void {
    if (!this.isEnabled) return;
    this.networkRequestCount++;
  }

  /**
   * 크리티컬 에러 카운트 증가
   */
  incrementCriticalError(): void {
    if (!this.isEnabled) return;
    this.criticalErrors++;
  }

  /**
   * 성능 데이터 수집
   */
  getPerformanceData(): PerformanceData {
    if (!this.isEnabled) {
      return {
        metrics: [],
        pageLoadTime: 0,
        networkRequests: 0
      };
    }
    
    const pageLoadTime = this.measurePageLoad();
    const memoryUsage = this.getMemoryUsage();

    return {
      metrics: Array.from(this.metrics.values()),
      pageLoadTime,
      memoryUsage: memoryUsage || undefined,
      networkRequests: this.networkRequestCount
    };
  }

  /**
   * 프로덕션용 핵심 메트릭 수집
   */
  getCoreMetrics(): CoreMetrics {
    if (!this.isEnabled) {
      return {
        pageLoadTime: 0,
        networkRequests: 0,
        criticalErrors: 0
      };
    }
    
    const pageLoadTime = this.measurePageLoad();
    const memoryUsage = this.getMemoryUsage();

    return {
      pageLoadTime,
      memoryUsage: memoryUsage || undefined,
      networkRequests: this.networkRequestCount,
      criticalErrors: this.criticalErrors
    };
  }

  /**
   * 성능 데이터 로깅 (개발 환경에서만)
   */
  logPerformanceData(): void {
    if (!this.isEnabled || !IS_DEVELOPMENT) return;
    
    const data = this.getPerformanceData();
    console.group('[Performance Report]');
    console.log('페이지 로드 시간:', `${data.pageLoadTime.toFixed(2)}ms`);
    if (data.memoryUsage) {
      console.log('메모리 사용량:', `${data.memoryUsage.toFixed(2)}MB`);
    }
    console.log('네트워크 요청 수:', data.networkRequests);
    console.log('상세 메트릭:', data.metrics);
    console.groupEnd();
  }

  /**
   * 프로덕션용 핵심 메트릭 로깅
   */
  logCoreMetrics(): void {
    if (!this.isEnabled || !IS_PRODUCTION) return;
    
    const coreMetrics = this.getCoreMetrics();
    
    // 프로덕션에서는 간단한 로깅 또는 분석 서비스로 전송
    if (coreMetrics.pageLoadTime > 3000) { // 3초 이상 로딩 시
      console.warn('[Performance] 느린 페이지 로딩 감지:', coreMetrics.pageLoadTime);
    }
    
    if (coreMetrics.criticalErrors > 0) {
      console.error('[Performance] 크리티컬 에러 발생:', coreMetrics.criticalErrors);
    }
  }

  /**
   * 성능 옵저버 설정
   */
  private setupPerformanceObserver(): void {
    if (!this.isEnabled || !('PerformanceObserver' in window)) return;
    
    // 개발 환경에서만 상세한 성능 옵저버 설정
    if (IS_DEVELOPMENT) {
      this.setupDetailedObservers();
    } else {
      // 프로덕션에서는 핵심 메트릭만 관찰
      this.setupCoreObservers();
    }
  }

  /**
   * 개발 환경용 상세 성능 옵저버
   */
  private setupDetailedObservers(): void {
    // 네비게이션 타이밍 측정
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('[Performance] 네비게이션 타이밍:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            domInteractive: navEntry.domInteractive,
            domComplete: navEntry.domComplete
          });
        }
      });
    });

    // 리소스 로딩 측정
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          // 느린 리소스만 로깅 (1초 이상)
          if (resourceEntry.duration > 1000) {
            console.log(`[Performance] 느린 리소스: ${resourceEntry.name} - ${resourceEntry.duration.toFixed(2)}ms`);
          }
        }
      });
    });

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('[Performance] PerformanceObserver 설정 실패:', error);
    }
  }

  /**
   * 프로덕션용 핵심 성능 옵저버
   */
  private setupCoreObservers(): void {
    // 네비게이션 타이밍만 관찰 (느린 로딩 감지용)
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
          
          // 3초 이상 로딩 시에만 로깅
          if (loadTime > 3000) {
            console.warn('[Performance] 느린 페이지 로딩:', loadTime);
          }
        }
      });
    });

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      // 프로덕션에서는 에러 로깅 생략
    }
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    if (!this.isEnabled) return;
    
    this.metrics.clear();
    this.networkRequestCount = 0;
    this.criticalErrors = 0;
    this.pageLoadStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// 전역 성능 모니터 인스턴스 (브라우저 환경에서만 생성)
let performanceMonitor: PerformanceMonitor | null = null;

if (typeof window !== 'undefined') {
  performanceMonitor = new PerformanceMonitor();
}

// 안전한 성능 모니터 접근을 위한 헬퍼 함수
function getPerformanceMonitor(): PerformanceMonitor | null {
  return performanceMonitor;
}

export { performanceMonitor, getPerformanceMonitor };

/**
 * 성능 측정 데코레이터 (함수용)
 */
export function measurePerformance(name: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.startMeasure(name);
      }
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const monitor = getPerformanceMonitor();
          if (monitor) {
            monitor.endMeasure(name);
          }
        });
      } else {
        const monitor = getPerformanceMonitor();
        if (monitor) {
          monitor.endMeasure(name);
        }
        return result;
      }
    };
  };
}

/**
 * React 컴포넌트 성능 측정 HOC
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.startMeasure(`${componentName}-mount`);
      }
      return () => {
        const monitor = getPerformanceMonitor();
        if (monitor) {
          monitor.endMeasure(`${componentName}-mount`);
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}

/**
 * 네트워크 요청 성능 측정
 */
export function measureNetworkRequest<T>(
  requestFn: () => Promise<T>,
  requestName: string
): Promise<T> {
  const monitor = getPerformanceMonitor();
  if (monitor) {
    monitor.startMeasure(requestName);
    monitor.incrementNetworkRequest();
  }

  return requestFn()
    .then((result) => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.endMeasure(requestName);
      }
      return result;
    })
    .catch((error) => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.endMeasure(requestName);
        monitor.incrementCriticalError();
      }
      throw error;
    });
}

/**
 * 개발 환경에서만 성능 로깅
 */
export function logPerformanceInDev(): void {
  if (IS_DEVELOPMENT) {
    setTimeout(() => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.logPerformanceData();
      }
    }, 1000);
  }
}

/**
 * 프로덕션용 핵심 메트릭 로깅
 */
export function logCoreMetrics(): void {
  if (IS_PRODUCTION) {
    setTimeout(() => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.logCoreMetrics();
      }
    }, 1000);
  }
}

/**
 * 성능 모니터링 활성화/비활성화
 */
export function setPerformanceMonitoringEnabled(enabled: boolean): void {
  if (performanceMonitor) {
    performanceMonitor.isEnabled = enabled;
  }
}