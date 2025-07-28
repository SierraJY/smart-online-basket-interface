// 회원가입
export async function signup({
  userId,
  password,
  gender,
  age,
}: {
  userId: string
  password: string
  gender: number
  age: number
}) {
  const res = await fetch('/api/customers/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password, gender, age }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '회원가입 실패')
  }
  return data // { message, userId }
}

// 로그인
export async function login({
  userId,
  userPasswd,
}: {
  userId: string
  userPasswd: string
}) {
  const res = await fetch('/api/customers/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userPasswd }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '로그인 실패')
  }
  return data // { message, accessToken, refreshToken, userId, customerId }
}

// 로그아웃
export async function logout(token: string) {
  const res = await fetch('/api/customer/logout', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || '로그아웃 실패')
  }
  return data // { success, message }
}
