// 구매기록 페이지

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/utils/hooks/useAuth';
import { useReceipts, Receipt, ReceiptItem } from '@/utils/hooks/useReceipts';
import { Receipt as ReceiptIcon, ShoppingBag, Calendar, DollarSign, Package } from 'lucide-react';
import { FaExclamationTriangle as FaExclamationTriangleIcon } from 'react-icons/fa';

// 구매기록 카드 컴포넌트
const ReceiptCard = ({ receipt, index }: { receipt: Receipt; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-6"
    >
      <div 
        className="p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
        style={{
          border: '1px solid var(--input-border)',
          backgroundColor: 'var(--input-background)',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ReceiptIcon className="w-6 h-6" style={{ color: 'var(--sobi-green)' }} />
            <div>
              <h3 className="text-lg font-semibold">구매 기록 #{receipt.id}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(receipt.createdAt)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: 'var(--sobi-green)' }}>
              {receipt.totalAmount.toLocaleString()}원
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              총 {receipt.totalCount}개 상품
            </div>
          </div>
        </div>

        {/* 상품 목록 (접힘/펼침) */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t pt-4"
            style={{ borderColor: 'var(--input-border)' }}
          >
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              구매 상품 목록
            </h4>
            <div className="space-y-3">
              {receipt.items.map((item, itemIndex) => (
                <div 
                  key={item.id}
                  className="flex items-center p-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--footer-background)',
                    border: '1px solid var(--footer-border)',
                  }}
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.quantity}개 × {item.productPrice.toLocaleString()}원
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: 'var(--sobi-green)' }}>
                      {item.totalPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 펼침/접힘 표시 */}
        <div className="text-center mt-3">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isExpanded ? '접기' : '상품 목록 보기'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ReceiptsPage() {
  const router = useRouter();
  const { isLoggedIn, accessToken: token } = useAuth();
  const { data, isLoading, error } = useReceipts(token);

  // 로그인 필요
  if (!isLoggedIn || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
        style={{ 
          backgroundImage: `
            linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)),
            url('/paper2.jpg')
          `,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          color: 'var(--foreground)' 
        }}
      >
        <FaExclamationTriangleIcon className="text-red-400 text-5xl mb-3 animate-bounce" />
        <div className="font-bold text-lg text-red-500 mb-2">로그인이 필요합니다!</div>
        <p className="text-base mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>
          구매기록을 확인하려면 로그인해주세요.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-full shadow hover:bg-neutral-700 transition-all"
        >
          로그인 하러가기
        </Link>
      </div>
    );
  }

  // 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
        style={{ 
          backgroundImage: `
            linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)),
            url('/paper2.jpg')
          `,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          color: 'var(--foreground)' 
        }}
      >
        <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold text-[var(--foreground)]">구매기록을 불러오는 중...</div>
        <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
        style={{ 
          backgroundImage: `
            linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)),
            url('/paper2.jpg')
          `,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          color: 'var(--foreground)' 
        }}
      >
        <FaExclamationTriangleIcon className="text-red-400 text-5xl mb-3 animate-bounce" />
        <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
        <div className="text-gray-500 dark:text-gray-300 text-base mb-4">
          {error.message || '구매기록을 불러오는 중 오류가 발생했습니다.'}
        </div>
        <button
          className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
          onClick={() => window.location.reload()}
        >
          새로고침
        </button>
      </div>
    );
  }

  const receipts = data?.receipts || [];

  return (
    <main className="min-h-screen py-8 pb-24 flex flex-col items-center"
      style={{ 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
        backgroundImage: `
          linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)),
          url('/paper2.jpg')
        `,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="w-full max-w-4xl px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--sobi-green)' }}>
            구매기록
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            나의 쇼핑 기록을 확인해보세요
          </p>
        </div>

        {/* 통계 정보 */}
        <div className="mb-8 p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            구매 통계
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--footer-background)',
                border: '1px solid var(--footer-border)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 결제 횟수</span>
              <span className="text-xl font-bold" style={{ color: 'var(--sobi-green)' }}>
                {receipts.length}회
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--footer-background)',
                border: '1px solid var(--footer-border)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 구매 금액</span>
              <span className="text-xl font-bold" style={{ color: 'var(--sobi-green)' }}>
                {receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--footer-background)',
                border: '1px solid var(--footer-border)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 구매 상품</span>
              <span className="text-xl font-bold" style={{ color: 'var(--sobi-green)' }}>
                {receipts.reduce((sum, receipt) => sum + receipt.totalCount, 0)}개
              </span>
            </div>
          </div>
        </div>

        {/* 구매기록 목록 */}
        <div className="p-6 rounded-lg shadow-sm"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            구매기록 목록
          </h2>
          
          {receipts.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                아직 구매기록이 없습니다.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                첫 구매를 해보세요!
              </p>
              <Link
                href="/"
                className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-full shadow hover:bg-green-700 transition-all"
              >
                쇼핑하러 가기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt, index) => (
                <ReceiptCard key={receipt.id} receipt={receipt} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 