'use client';

import React from 'react';
import { useAuth } from '@/utils/hooks/useAuth';

export default function AccessTokenRefreshButton() {
  const { refreshAccessToken } = useAuth();
  const handleRefresh = async () => {
    try {
      const newToken = await refreshAccessToken();
      alert('갱신 성공!\n새 accessToken:\n' + newToken);
      // 여기서 console.log로 상태/스토리지 확인도 가능!
      console.log('새 accessToken:', newToken);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      alert('갱신 실패!\n' + errorMessage);
      console.error(err);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      className="px-4 py-2 rounded bg-green-700 text-white shadow hover:bg-green-800 mt-4"
      style={{ fontWeight: 700 }}
    >
      accessToken 리프레시 테스트
    </button>
  );
}
