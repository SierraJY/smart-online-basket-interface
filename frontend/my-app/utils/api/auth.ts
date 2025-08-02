import { config } from '@/config/env';

// 로그인 요청
export async function login({ userId, userPasswd }: { userId: string; userPasswd: string }) {
  const res = await fetch(config.API_ENDPOINTS.CUSTOMERS_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userPasswd }),
  });
  if (!res.ok) throw new Error("로그인 실패");
  return await res.json();
}

// 회원가입 요청
export async function signup({ userId, password, gender, age }: { userId: string; password: string; gender: number; age: number }) {
  const res = await fetch(config.API_ENDPOINTS.CUSTOMERS_SIGNUP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password, gender, age }),
  });
  if (!res.ok) throw new Error("회원가입 실패");
  return await res.json();
}

// 내 정보 fetch
export async function fetchMe(token: string) {
  const res = await fetch(config.API_ENDPOINTS.CUSTOMERS_PROFILE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("회원정보 조회 실패");
  return await res.json();
}

// accessToken 리프레시
export async function refreshToken(refreshToken: string) {
  const res = await fetch(config.API_ENDPOINTS.AUTH_REFRESH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("토큰 갱신 실패");
  return await res.json();
}
