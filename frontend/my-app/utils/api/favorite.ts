import { getToken } from "@/utils/auth/authUtils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchFavorite() {
  const token = getToken();
  const res = await fetch(`${API}/api/favorites/my`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error("찜목록 불러오기 실패");
  return res.json();
}

export async function addFavorite(productId: number) {
  const token = getToken();
  const res = await fetch(`${API}/api/favorites/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("찜 추가 실패");
  return res.json();
}

export async function removeFavorite(productId: number) {
  const token = getToken();
  const res = await fetch(`${API}/api/favorites/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("찜 제거 실패");
  return res.json();
}