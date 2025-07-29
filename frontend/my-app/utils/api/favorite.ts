// 찜 추가 (POST)
export async function addFavorite(productId: number, accessToken: string) {
  return fetch(`/api/favorites/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include", // 필요시
  }).then((res) => {
    if (!res.ok) throw new Error("찜 추가 실패!");
    return res.json(); // message 포함 응답
  });
}

// 찜 해제 (DELETE)
export async function removeFavorite(productId: number, accessToken: string) {
  return fetch(`/api/favorites/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include", // 필요시
  }).then((res) => {
    if (!res.ok) throw new Error("찜 해제 실패!");
    return res.json(); // message 포함 응답
  });
}

// 찜목록 조회 (GET)
export async function fetchFavoriteList(accessToken: string) {
  return fetch("/api/favorites/my", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("찜 목록 조회 실패!");
    return res.json(); // { favoriteProducts, ... }
  });
}
