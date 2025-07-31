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
25/07/28
카테고리 페이지, 찜목록 api 연동 다시 확인

- 새로고침 시 로그아웃되는 이유
새로고침(F5) 시 상태가 휘발되는데, 스토리지에서 자동 복원(재로그인)이 안 되고 있어서!

새로고침 → store는 날아감 → localStorage에 accessToken 있음 → 자동으로 store로 복구 필요
일단 zustand persist를 활용해 'auth-storage'에 로그인상태와 userid저장해서 새로고침 시 로그아웃 방지
--------
25/07/29

1. QR코드를 찍어서 boardMac코드를 받는다.
2. 
fetch : '/api/baskets/start/' + boardMac
method : 'POST'
headers : 'Authorization : Bearer + token
요청을 보낸다.
3. 200 응답을 받으면 SSE 요청을 보낸다
'/api/baskets/my/stream'
headers : 'Authorization : Bearer + token
4. 2번의 요청이 모두 성공하면 사용자는 장바구니 페이지에서 백엔드에서 주는 정보를 통해 실시간으로 장바구니에 들어오고 나가는 상품 정보를 확인할 수 있다.

현재 첫번째 요청은 받으나 두번째 요청인 SSE 실행이 안되고 있는 상황
아마 중복 요청이 원인인듯
--------
25/07/30
api 요청이 중복되는 현상을 고치기 위해 React Query를 이용해 전체 페이지 리팩토링 작업
그와 동시에 store에서 관리하던 항목을 커스텀 훅에서 관리하도록 이전 작업

gpt왈

store → hook 전환, 현업에서도 하는 게 맞나?
장단점 비교
store(전역 상태, 예: Zustand, Recoil 등)

✔️ 앱 전체에서 "동기화된 상태"를 초간단하게 공유

✔️ 여러 컴포넌트에서 상태 자동 공유, 리렌더

❌ 실제로 로그인/토큰 등은 보통 localStorage + hook만으로도 충분

❌ 불필요한 전역상태/리렌더 증가할 수 있음

hook(커스텀 훅, 예: useAuth)

✔️ SSR/CSR 대응, localStorage와의 동기화까지 포함, 진짜 실전적!

✔️ 로그인 상태/토큰 변화만 잘 관리하면 전역 상태 라이브러리 없이도 문제 없음

✔️ Next.js, React Query, CSR 앱에선 사실상 industry standard

❌ 아주 복잡한 상태 동기화/협업에서 store가 필요할 수도 있음