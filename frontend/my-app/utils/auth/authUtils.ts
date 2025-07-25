// 사용자 인증 관련 유틸 함수
export const setToken = (email: string) => {
  localStorage.setItem('auth-token', `${email}-token`)
}

export const getToken = () => {
  return localStorage.getItem('auth-token')
}

export const removeToken = () => {
  localStorage.removeItem('auth-token')
}

// 사용자 정보 등록 (이메일 중복 체크 포함)
export const registerUser = ({ name, email, password }: { name: string; email: string; password: string }) => {
  const users = JSON.parse(localStorage.getItem('users') || '[]')

  if (users.find((user: any) => user.email === email)) {
    return '이미 존재하는 이메일입니다.'
  }

  users.push({ name, email, password })
  localStorage.setItem('users', JSON.stringify(users))
  return null
}