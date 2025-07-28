import { useState, useEffect } from "react"

export type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: string
  imageUrl: string
  discountRate: number
  sales: number
  tag: string | null
  location: string | null
  description: string | null
  brand: string
  discountedPrice: number
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch('/products.json')
      .then(res => res.json())
      .then((data: Product[]) => {
        setProducts(data)
        setLoading(false)
      })
      .catch(e => {
        setError(e)
        setLoading(false)
      })
  }, [])

  return { products, loading, error }
}