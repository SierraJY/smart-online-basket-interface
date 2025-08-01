// 성능 모니터링 유틸리티

import React from 'react';

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

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private pageLoadStartTime: number;
  private networkRequestCount: number = 0;

  constructor() {
    this.pageLoadStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // 브라우저 환경에서만 PerformanceObserver 설정
    if (typeof window !== 'undefined') {
      this.setupPerformanceObserver();
    }
  }

  /**
   * 성능 측정 시작
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
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
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Performance] 측정되지 않은 메트릭: ${name}`);
      return null;
    }

    metric.endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);
    return metric.duration;
  }

  /**
   * 페이지 로드 시간 측정
   */
  measurePageLoad(): number {
    const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pageLoadTime = currentTime - this.pageLoadStartTime;
    console.log(`[Performance] 페이지 로드 시간: ${pageLoadTime.toFixed(2)}ms`);
    return pageLoadTime;
  }

  /**
   * 메모리 사용량 측정 (브라우저 지원 시)
   */
  getMemoryUsage(): number | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usageMB = memory.usedJSHeapSize / 1024 / 1024;
      console.log(`[Performance] 메모리 사용량: ${usageMB.toFixed(2)}MB`);
      return usageMB;
    }
    return null;
  }

  /**
   * 네트워크 요청 카운트 증가
   */
  incrementNetworkRequest(): void {
    this.networkRequestCount++;
  }

  /**
   * 성능 데이터 수집
   */
  getPerformanceData(): PerformanceData {
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
   * 성능 데이터 로깅
   */
  logPerformanceData(): void {
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
   * 성능 옵저버 설정
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
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
            console.log(`[Performance] 리소스 로드: ${resourceEntry.name} - ${resourceEntry.duration.toFixed(2)}ms`);
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
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.metrics.clear();
    this.networkRequestCount = 0;
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
      }
      throw error;
    });
}

/**
 * 개발 환경에서만 성능 로깅
 */
export function logPerformanceInDev(): void {
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.logPerformanceData();
      }
    }, 1000);
  }
}