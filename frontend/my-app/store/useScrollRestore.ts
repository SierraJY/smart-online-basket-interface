import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

// 스크롤 위치 타입 정의
interface ScrollPosition {
  x: number;
  y: number;
}

// 스크롤 저장/복원 유틸리티
const scrollStorage = {
  save: (key: string, position: ScrollPosition) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(position));
    } catch (error) {
      console.warn('[ScrollRestore] 스크롤 위치 저장 실패:', error);
    }
  },
  
  load: (key: string): ScrollPosition | null => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('[ScrollRestore] 스크롤 위치 로드 실패:', error);
      return null;
    }
  },
  
  clear: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('[ScrollRestore] 스크롤 위치 삭제 실패:', error);
    }
  }
};

/**
 * 페이지별 스크롤 위치 기억 & 복원 (sessionStorage)
 * - 페이지 마운트/복귀시 sessionStorage에서 복원
 * - 스크롤/페이지이동/뒤로가기 때마다 자동 저장
 * - @param ready: 데이터가 다 준비된 후 true(예: 상품 리스트 도착 후)
 * - @param delay: 복원 지연 시간 (ms, 기본값: 100)
 * - @param throttleMs: 스크롤 이벤트 쓰로틀링 (ms, 기본값: 100)
 */
export function useScrollRestore(
  ready: boolean = true, 
  delay: number = 100,
  throttleMs: number = 100
) {
  const pathname = usePathname();
  const scrollKey = `scroll-pos:${pathname}`;
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef<number>(0);
  const isRestoring = useRef<boolean>(false);

  // 스크롤 위치 저장 (쓰로틀링 적용)
  const saveScrollPosition = useCallback(() => {
    if (isRestoring.current) return;
    
    const currentScrollY = window.scrollY;
    if (Math.abs(currentScrollY - lastScrollY.current) < 10) return; // 10px 이상 변화시에만 저장
    
    lastScrollY.current = currentScrollY;
    
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    
    throttleRef.current = setTimeout(() => {
      scrollStorage.save(scrollKey, { x: window.scrollX, y: window.scrollY });
    }, throttleMs);
  }, [scrollKey, throttleMs]);

  // 스크롤 위치 복원
  const restoreScrollPosition = useCallback(() => {
    if (!ready) return;
    
    const savedPosition = scrollStorage.load(scrollKey);
    if (!savedPosition) return;
    
    isRestoring.current = true;
    
    setTimeout(() => {
      window.scrollTo({ 
        top: savedPosition.y, 
        left: savedPosition.x, 
        behavior: 'auto' 
      });
      
      // 복원 완료 후 플래그 해제
      setTimeout(() => {
        isRestoring.current = false;
      }, 50);
    }, delay);
  }, [scrollKey, ready, delay]);

  // 스크롤 이벤트 리스너 (메모이제이션된 함수 사용)
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoring.current) {
        saveScrollPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [saveScrollPosition]);

  // 스크롤 위치 복원 (ready 상태 변경시)
  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  // 수동으로 스크롤 위치 저장하는 함수 반환
  const saveCurrentPosition = useCallback(() => {
    scrollStorage.save(scrollKey, { x: window.scrollX, y: window.scrollY });
  }, [scrollKey]);

  // 수동으로 스크롤 위치 삭제하는 함수 반환
  const clearSavedPosition = useCallback(() => {
    scrollStorage.clear(scrollKey);
  }, [scrollKey]);

  return {
    saveCurrentPosition,
    clearSavedPosition,
    isRestoring: isRestoring.current
  };
}

/**
 * 특정 요소의 스크롤 위치 복원 (예: 컨테이너 내부 스크롤)
 */
export function useElementScrollRestore(
  elementRef: React.RefObject<HTMLElement>,
  ready: boolean = true,
  delay: number = 100
) {
  const pathname = usePathname();
  const scrollKey = `element-scroll-pos:${pathname}`;
  const isRestoring = useRef<boolean>(false);

  const saveElementScrollPosition = useCallback(() => {
    if (!elementRef.current || isRestoring.current) return;
    
    const element = elementRef.current;
    scrollStorage.save(scrollKey, { 
      x: element.scrollLeft, 
      y: element.scrollTop 
    });
  }, [elementRef, scrollKey]);

  const restoreElementScrollPosition = useCallback(() => {
    if (!ready || !elementRef.current) return;
    
    const savedPosition = scrollStorage.load(scrollKey);
    if (!savedPosition) return;
    
    isRestoring.current = true;
    
    setTimeout(() => {
      if (elementRef.current) {
        elementRef.current.scrollTo({
          top: savedPosition.y,
          left: savedPosition.x,
          behavior: 'auto'
        });
      }
      
      setTimeout(() => {
        isRestoring.current = false;
      }, 50);
    }, delay);
  }, [elementRef, scrollKey, ready, delay]);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      if (!isRestoring.current) {
        saveElementScrollPosition();
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [elementRef, saveElementScrollPosition]);

  // 스크롤 위치 복원
  useEffect(() => {
    restoreElementScrollPosition();
  }, [restoreElementScrollPosition]);

  return {
    saveElementScrollPosition,
    clearSavedPosition: () => scrollStorage.clear(scrollKey),
    isRestoring: isRestoring.current
  };
}