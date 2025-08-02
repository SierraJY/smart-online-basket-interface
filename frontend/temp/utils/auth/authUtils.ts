export function setToken(token: string) {
  localStorage.setItem('access-token', token)
}
export function getToken(): string | null {
  return localStorage.getItem('access-token')
}
export function removeToken() {
  localStorage.removeItem('access-token')
}
