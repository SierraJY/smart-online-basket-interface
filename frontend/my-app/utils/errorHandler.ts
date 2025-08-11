// 에러 처리 통일 유틸리티
import { AppError } from '../types';
import { config } from '@/config/env';

// 에러 타입 정의
interface ApiError extends Error {
  status?: number;
  code?: string;
}

interface NetworkError extends Error {
  name: 'TypeError';
  message: string;
}

interface SSEError extends Error {
  name: string;
  message: string;
}

/**
 * API 에러를 사용자 친화적인 메시지로 변환
 */
export function handleApiError(error: unknown): AppError {
  console.error('[Error Handler]', error);

  // 네트워크 에러
  if (isNetworkError(error)) {
    return {
      message: '네트워크 연결을 확인해주세요.',
      code: 'NETWORK_ERROR',
      originalError: error
    };
  }

  // HTTP 상태 코드별 에러
  if (isApiError(error) && error.status) {
    switch (error.status) {
      case 400:
        return {
          message: '잘못된 요청입니다. 입력값을 확인해주세요.',
          code: 'BAD_REQUEST',
          status: 400,
          originalError: error
        };
      case 401:
        return {
          message: '로그인이 필요합니다.',
          code: 'UNAUTHORIZED',
          status: 401,
          originalError: error
        };
      case 403:
        return {
          message: '접근 권한이 없습니다.',
          code: 'FORBIDDEN',
          status: 403,
          originalError: error
        };
      case 404:
        return {
          message: '요청한 리소스를 찾을 수 없습니다.',
          code: 'NOT_FOUND',
          status: 404,
          originalError: error
        };
      case 500:
        return {
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          code: 'SERVER_ERROR',
          status: 500,
          originalError: error
        };
      default:
        return {
          message: `오류가 발생했습니다. (${error.status})`,
          code: 'HTTP_ERROR',
          status: error.status,
          originalError: error
        };
    }
  }

  // 커스텀 에러 메시지
  if (isErrorWithMessage(error)) {
    return {
      message: error.message,
      code: 'CUSTOM_ERROR',
      originalError: error
    };
  }

  // 기본 에러
  return {
    message: '알 수 없는 오류가 발생했습니다.',
    code: 'UNKNOWN_ERROR',
    originalError: error
  };
}

/**
 * React Query 에러를 처리
 */
export function handleQueryError(error: unknown): AppError {
  return handleApiError(error);
}

/**
 * Mutation 에러를 처리
 */
export function handleMutationError(error: unknown): AppError {
  return handleApiError(error);
}

/**
 * SSE 연결 에러를 처리
 */
export function handleSSEError(error: unknown): AppError {
  console.error('[SSE Error Handler]', error);

  if (isSSEError(error) && error.name === 'AbortError') {
    return {
      message: '연결이 중단되었습니다.',
      code: 'SSE_ABORTED',
      originalError: error
    };
  }

  if (isErrorWithMessage(error) && error.message?.includes('fetch')) {
    return {
      message: '실시간 연결에 실패했습니다. 네트워크를 확인해주세요.',
      code: 'SSE_NETWORK_ERROR',
      originalError: error
    };
  }

  return {
    message: '실시간 연결 오류가 발생했습니다.',
    code: 'SSE_ERROR',
    originalError: error
  };
}

// 타입 가드 함수들
function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && 
         error.name === 'TypeError' && 
         error.message.includes('fetch');
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

function isSSEError(error: unknown): error is SSEError {
  return error instanceof Error;
}

function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error && !!error.message;
}

/**
 * 사용자에게 에러 메시지 표시
 */
export function showErrorToUser(error: AppError): void {
  // 브라우저 환경에서만 실행
  if (typeof window !== 'undefined') {
    // 기본 alert 사용 (나중에 토스트나 모달로 교체 가능)
    alert(error.message);
  }
}

/**
 * 에러 로깅 (개발/프로덕션 환경별 처리)
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
      originalError: error.originalError
    }
  };

  if (config.isDevelopment) {
    console.error('[Error Log]', logData);
  } else {
    // 프로덕션에서는 에러 추적 서비스로 전송
    // 예: Sentry, LogRocket 등
    console.error('[Error Log]', logData);
  }
} 