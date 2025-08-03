기술 스택

프레임워크: Next.js 15.4.1 (React 19.1.0)
언어: TypeScript
CSS: Tailwind CSS 4.1.11
PWA: next-pwa
상태관리: Zustand, React Query
애니메이션 처리: Framer Motion
실시간 동기화: EventSource-polyfill (SSE)
UI 컴포넌트: Lucide React, React Icons 등


주요 기능 및 페이지별 특징

1. 메인 페이지 (/)
파일: frontend/my-app/app/page.tsx
핵심 기능
AI 추천 상품: 개인화 추천
테마별 상품 섹션: AI 추천, 할인, 인기, 특가 상품
무한 스크롤: 자동으로 상품 목록 순환
드래그 스크롤: 마우스 드래그로 상품 탐색
차별점
실시간 추천: 장바구니 변화에 따른 즉시 추천 업데이트
반응형 디자인: 모바일 최적화

2. QR 스캔 페이지 (/scan)
파일: frontend/my-app/app/scan/page.tsx
핵심 기능
QR 코드 스캔: HTML5 QR Scanner 활용
카메라 권한 관리: 브라우저 카메라 접근 권한 처리
장바구니 연결: 스캔된 QR로 장바구니 ID 연결
실시간 연결: 스캔 즉시 장바구니 활성화

3. 장바구니 페이지 (/baskets)
파일: frontend/my-app/app/baskets/page.tsx
핵심 기능
실시간 장바구니 관리: SSE를 통한 실시간 업데이트
결제 요약: 총액 및 상품 개수 실시간 계산
상품 상세 연결: 클릭 시 상품 상세 페이지 이동
실시간 동기화: MQTT + SSE를 통한 즉시 반영
Toast 알림: 상품 추가 시 이미지 포함 알림

4. 상품 목록 페이지 (/products)
파일: frontend/my-app/app/products/page.tsx
핵심 기능
카테고리별 분류: 상품 카테고리별 섹션 구성
검색 및 필터링: 키워드 검색, 카테고리 필터, 재고 필터
무한 스크롤: 카테고리별 자동 순환
찜 기능: 실시간 찜 추가/제거
스크롤 복원: 페이지 이동 후 스크롤 위치 유지

5. 상품 상세 페이지 (/products/[id])
파일: frontend/my-app/app/products/[id]/ProductDetailClient.tsx
핵심 기능
상품 정보 표시: 이미지, 가격, 재고, 브랜드 정보
찜 기능: 상품 상세에서 직접 찜 추가/제거
반응형 이미지: 상품 이미지 최적화 표시
차별점
실시간 재고: 재고 정보 실시간 업데이트

6. 찜 목록 페이지 (/favorite)
파일: frontend/my-app/app/favorite/page.tsx
핵심 기능
찜한 상품 목록: 사용자별 찜 상품 관리
실시간 업데이트: 찜 추가/제거 즉시 반영
상품 정보 연동: 찜 목록과 상품 정보 실시간 동기화
실시간 동기화: 찜 상태 변경 즉시 반영

7. 로그인/회원가입 페이지
파일: frontend/my-app/app/login/page.tsx, frontend/my-app/app/signup/page.tsx
핵심 기능
JWT 인증: 토큰 기반 인증 시스템
자동 로그인: 토큰 유효성 자동 확인
반응형 폼: 모바일 최적화된 입력 폼


UI/UX

1. 테마 시스템
다크모드 지원: 완전한 다크모드 구현
CSS 변수: 동적 테마 변경 지원
일관된 디자인: 모든 페이지에서 통일된 디자인 언어

2. 인터랙티브 요소
물고기 수족관: 장바구니를 수족관으로 표현한 창의적 UI
상품 흔들림: 상품 카드의 랜덤 흔들림 효과
드래그 스크롤: 직관적인 상품 탐색

3. 반응형 디자인
모바일 우선: 모바일 환경 최적화
적응형 레이아웃: 화면 크기에 따른 자동 조정
터치 친화적: 터치 인터페이스 최적화

4. 사용자 친화적
한손 조작: 한손으로도 간편한 사용


성능 최적화

Next.js 최적화: 자동 코드 분할 및 최적화
이미지 최적화: Next.js Image 컴포넌트 활용
캐싱 전략: Service Worker를 통한 효율적인 캐싱


--------------

08/03

최적화 및 효율성 개선



### 우선순위 1: 긴급 개선사항

1.1 SSE 연결 최적화
파일: utils/hooks/useGlobalBasketSSE.tsx (558줄)
문제점: 과도한 console.log (50+ 개), 복잡한 재연결 로직
개선방안:
프로덕션 환경에서 console.log 제거
재연결 로직 단순화
메모리 누수 방지를 위한 cleanup 강화

1.2 성능 모니터링 최적화 (해결)
파일: utils/performance.tsx (285줄)
문제점: 모든 환경에서 성능 측정 실행
개선방안:
개발 환경에서만 활성화
프로덕션에서는 핵심 메트릭만 수집


### 우선순위 2: 중요 개선사항

2.1 코드 스플리팅 미활용
파일: utils/dynamicImports.tsx (138줄)
문제점: 정의만 있고 실제 사용되지 않음
개선방안:
무거운 컴포넌트들 동적 임포트 적용
페이지별 코드 스플리팅 구현

2.2 중복 API 호출 방지
파일: utils/hooks/useProducts.tsx, utils/hooks/useAuth.tsx
문제점: 동일한 API 중복 호출 가능성
개선방안:
React Query 캐싱 전략 강화
API 호출 중복 방지 로직 추가

2.3 이미지 최적화
파일: 전체 이미지 사용 컴포넌트
문제점: unoptimized: true 설정으로 인한 성능 저하
개선방안:
Next.js Image 컴포넌트 최적화 활성화
WebP 포맷 우선 사용
Lazy loading 강화


### 우선순위 3: 중간 개선사항

3.1 상태 관리 최적화
파일: store/useBasketStore.ts, store/useScrollRestore.ts
문제점: 불필요한 리렌더링 발생 가능
개선방안:
Zustand selector 최적화
메모이제이션 적용

3.2 에러 핸들링 통합
파일: utils/errorHandler.ts (166줄)
문제점: 일관되지 않은 에러 처리
개선방안:
전역 에러 바운더리 구현
에러 로깅 시스템 통합

3.3 타입 안정성 강화
파일: types/index.ts (213줄)
문제점: any 타입 사용, 불완전한 타입 정의
개선방안:
any 타입 제거
엄격한 타입 정의 적용


### 우선순위 4: 개선사항

4.1 번들 크기 최적화
파일: package.json
문제점: 불필요한 의존성, 큰 번들 크기
개선방안:
Tree shaking 최적화
사용하지 않는 라이브러리 제거

4.2 PWA 최적화
파일: next.config.ts, components/ServiceWorkerProvider.tsx
문제점: PWA 기능 미완성
개선방안:
오프라인 지원 강화
캐싱 전략 개선

4.3 접근성 개선
파일: 전체 컴포넌트
문제점: 접근성 고려 부족
개선방안:
ARIA 라벨 추가
키보드 네비게이션 지원