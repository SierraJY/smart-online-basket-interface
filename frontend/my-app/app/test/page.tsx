'use client';

import { useState } from 'react';
import { useAuth } from '@/utils/hooks/useAuth';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle, Clock, User, Key } from 'lucide-react';

export default function TestPage() {
  const { accessToken, refreshToken: currentRefreshToken, userId, isLoggedIn, logout, mounted, refreshAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  } | null>(null);

  // 토큰 정보 디코딩 함수
  const decodeToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // 토큰 만료 시간 계산
  const getTokenExpiry = (token: string) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    if (remainingTime <= 0) return '만료됨';
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}분 ${seconds}초`;
  };

  // 리프레시 토큰 테스트
  const handleRefreshTokenTest = async () => {
    if (!currentRefreshToken) {
      setResult({
        success: false,
        message: '리프레시 토큰이 없습니다. 먼저 로그인해주세요.'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // useAuth의 refreshAccessToken 함수 사용 (localStorage 자동 저장)
      const newAccessToken = await refreshAccessToken();
      
      setResult({
        success: true,
        message: '토큰 갱신 성공! localStorage에 새로운 토큰이 저장되었습니다.',
        data: { 
          newAccessToken: newAccessToken?.substring(0, 50) + '...',
          message: '새로운 액세스 토큰이 발급되어 localStorage에 저장되었습니다.'
        }
      });

      // 성공 시 페이지 새로고침하여 새로운 토큰 정보 표시
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '토큰 갱신 실패';
      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 강제 토큰 만료 테스트 (개발용)
  const handleForceExpireTest = () => {
    if (!accessToken) {
      setResult({
        success: false,
        message: '액세스 토큰이 없습니다.'
      });
      return;
    }

    // 토큰을 임시로 만료된 것으로 표시 (실제로는 만료되지 않음)
    const decoded = decodeToken(accessToken);
    if (decoded) {
      const fakeExpiredToken = {
        ...decoded,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1시간 전으로 설정
      };
      
      console.log('[Test] 강제 만료된 토큰:', fakeExpiredToken);
      setResult({
        success: true,
        message: '토큰을 강제로 만료된 것으로 표시했습니다. (개발용)',
        data: { fakeExpiredToken }
      });
    }
  };

  // 현재 토큰 정보 표시
  const currentAccessTokenInfo = accessToken ? decodeToken(accessToken) : null;
  const currentRefreshTokenInfo = currentRefreshToken ? decodeToken(currentRefreshToken) : null;

  // mounted 상태가 false이면 로딩 표시
  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ 
          color: 'var(--foreground)',
          backgroundColor: 'var(--background)'
        }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-lg font-semibold">토큰 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 px-4"
      style={{ 
        color: 'var(--foreground)',
        backgroundColor: 'var(--background)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🔧 토큰 테스트 페이지</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            리프레시 토큰 기능을 테스트할 수 있습니다
          </p>
        </div>

        {/* 로그인 상태 */}
        <div className="mb-8 p-6 rounded-lg shadow-sm"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            현재 로그인 상태
          </h2>
          
          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">로그인됨</span>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div>사용자 ID: {userId}</div>
                <div>액세스 토큰 만료: {accessToken ? getTokenExpiry(accessToken) : 'N/A'}</div>
                <div>리프레시 토큰 만료: {currentRefreshToken ? getTokenExpiry(currentRefreshToken) : 'N/A'}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span>로그인되지 않음</span>
            </div>
          )}
        </div>

        {/* 토큰 정보 */}
        {isLoggedIn && (
          <div className="mb-8 p-6 rounded-lg shadow-sm"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
            }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              토큰 정보
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 액세스 토큰 */}
              <div>
                <h3 className="font-medium mb-2">액세스 토큰</h3>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded break-all">
                  {accessToken ? (
                    <div>
                      <div className="mb-2">
                        <strong>만료 시간:</strong> {getTokenExpiry(accessToken)}
                      </div>
                      <div className="mb-2">
                        <strong>사용자 ID:</strong> {currentAccessTokenInfo?.sub || 'N/A'}
                      </div>
                      <div className="mb-2">
                        <strong>고객 ID:</strong> {currentAccessTokenInfo?.customerId || 'N/A'}
                      </div>
                      <div>
                        <strong>토큰:</strong> {accessToken.substring(0, 50)}...
                      </div>
                    </div>
                  ) : (
                    '토큰 없음'
                  )}
                </div>
              </div>

              {/* 리프레시 토큰 */}
              <div>
                <h3 className="font-medium mb-2">리프레시 토큰</h3>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded break-all">
                  {currentRefreshToken ? (
                    <div>
                      <div className="mb-2">
                        <strong>만료 시간:</strong> {getTokenExpiry(currentRefreshToken)}
                      </div>
                      <div className="mb-2">
                        <strong>사용자 ID:</strong> {currentRefreshTokenInfo?.sub || 'N/A'}
                      </div>
                      <div className="mb-2">
                        <strong>고객 ID:</strong> {currentRefreshTokenInfo?.customerId || 'N/A'}
                      </div>
                      <div>
                        <strong>토큰:</strong> {currentRefreshToken.substring(0, 50)}...
                      </div>
                    </div>
                  ) : (
                    '토큰 없음'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 테스트 버튼들 */}
        <div className="mb-8 p-6 rounded-lg shadow-sm"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4">테스트 기능</h2>
          
          <div className="space-y-4">
            {/* 리프레시 토큰 테스트 */}
            <motion.button
              onClick={handleRefreshTokenTest}
              disabled={!isLoggedIn || isLoading}
              className="w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--sobi-green-light)',
                border: '1px solid var(--sobi-green-border)',
                color: 'var(--sobi-green)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isLoading ? '토큰 갱신 중...' : '리프레시 토큰 테스트'}
              </div>
            </motion.button>

            {/* 강제 만료 테스트 (개발용) */}
            <motion.button
              onClick={handleForceExpireTest}
              disabled={!isLoggedIn}
              className="w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--input-background)',
                border: '1px solid var(--input-border)',
                color: 'var(--foreground)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                강제 만료 테스트 (개발용)
              </div>
            </motion.button>

            {/* 로그아웃 */}
            <motion.button
              onClick={logout}
              className="w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--input-background)',
                border: '1px solid var(--input-border)',
                color: 'var(--foreground)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              로그아웃
            </motion.button>
          </div>
        </div>

        {/* 결과 표시 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-lg shadow-sm"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: result.success ? 'var(--sobi-green-light)' : 'var(--input-background)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <h3 className="font-semibold">
                {result.success ? '성공' : '실패'}
              </h3>
            </div>
            
            <p className="mb-3">{result.message}</p>
            
            {result.data && (
              <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <pre className="whitespace-pre-wrap">{String(JSON.stringify(result.data, null, 2))}</pre>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
} 