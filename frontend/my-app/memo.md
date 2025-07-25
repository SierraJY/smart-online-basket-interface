React, Next.js, Tailwindcss
npx create-next-app@latest '프로젝트명'

-Nex.js는 기본적으로 모든 컴포넌트가 서버에서 랜더링 됨.
그렇기 때문에 useState, onClick 등 브라우저에서 작동하는 동작을 사용할 땐
위에 'use clinet'를 작성해 클라이언트 컴포넌트임을 선언해야 함.

-Next.js의 App Router 방식 : 폴더가 곧 페이지
----------
25/07/20
페이지 전환 시 애니메이션 추가 (framer-motion 라이브러리 사용)
setShowChildren, {showChildren ? children : null}으로 애니메이션 작동 후 페이지 렌더링 되도록
----------
25/07/21
ios 환경에서도 글씨 복사 못하게 방지하기
전역 css '-webkit-user-select: none' 설정
----------
검색 후 키워드 삭제

useEffect(() => {
  if (!isOpen) {
    setKeyword('')
    setCategory('전체')
  }
}, [isOpen])
----------
/utils
  ├── /api        ← 서버 통신 관련 (fetch, axios 등)
  │     └── auth.ts   ← 로그인/회원가입 요청 함수
  └── /auth       ← 인증 상태 관리 로직 (localStorage 기반 등)
        ├── useAuth.ts      ← 훅 형태로 관리
        └── authUtils.ts    ← 유틸 함수로 저장/검증 등
----------
25/07/21

렌더링 라이프사이클 제대로 알기
store의 쓰임에 대해 생각해보기
디자인 가이드 정확히 이해하기
실무 레벨에 도달하면 vanila javescript 공부하기
(SPA 프레임워크로 만든걸 바닐라 자바스크립트로도 구현하는 연습)
사이트추천 : storybook, vuexy
----------
찜목록 추가 방식 (임시)

회원만 접근 가능한 wishlist 페이지 → useEffect + getToken() 없으면 /login 리다이렉트

사용자별 찜 목록 분리 → wishlist-${email}로 key 관리

상품 목록/상세에서 찜 버튼 추가 및 디자인 유지 → 한 개 버튼으로 토글 방식 구현

로그아웃 후에도 찜 유지 → localStorage 기반이기 때문에 OK

추가된 파일/수정된 위치 정리

utils/wishlistUtils.ts 📂 새로 생성

useAuthStore.ts → wishlist, setWishlist 추가

useAuth.ts → 로그인 시 찜 목록 동기화

products/page.tsx, products/[id]/page.tsx → 찜 토글 버튼 추가

wishlist/page.tsx → 찜 페이지 신규 작성
----------
25/07/22

다크모드 설정법

:root 와 .dark 구분 (라이트모드와 다크모드)
css 변수는 직접 설정 가능
'background-color: var(--input-background);'
전역 CSS 변수 --background, --foreground를 활용

CSS 변수 네이밍 및 설정 확실히 하기
---------
25/07/23
개별 카테고리 상품 목록에서도 품절 상품 흑백,흐림 적용
FCM 토큰을 통한 푸쉬 알림 기능 구현