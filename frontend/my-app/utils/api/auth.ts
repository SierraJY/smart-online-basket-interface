import { setToken } from '../auth/authUtils';

export const login = async (email: string, password: string) => {
  // 임시: 이메일과 비밀번호가 같으면 로그인 성공으로 간주
  if (email && password && email === password) {
    const dummyToken = 'dummy-token';
    setToken(dummyToken);
    return { success: true };
  }
  return { success: false };
};

// 추후 백엔드 API 연동을 위해서.. 지금은 미사용
export const fakeSignup = async ({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) => {
  await new Promise((res) => setTimeout(res, 1000));
  if (email && password.length >= 8 && name) {
    return { success: true };
  } else {
    throw new Error('Invalid input');
  }
};