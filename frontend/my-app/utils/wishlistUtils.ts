export const getWishlist = (email: string): number[] => {
  const stored = localStorage.getItem(`wishlist-${email}`)
  return stored ? JSON.parse(stored) : []
}

export const toggleWishlist = (email: string, productId: number): number[] => {
  const current = getWishlist(email)
  const updated = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId]
  localStorage.setItem(`wishlist-${email}`, JSON.stringify(updated))
  return updated
}