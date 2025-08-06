// 구매내역 페이지

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/utils/hooks/useAuth';
import { useReceipts, Receipt } from '@/utils/hooks/useReceipts';
import { Receipt as ReceiptIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { FaExclamationTriangle as FaExclamationTriangleIcon } from 'react-icons/fa';
import { useQueryClient } from '@tanstack/react-query';

// 기간별 필터 타입
type PeriodFilter = 'all' | '1week' | '1month' | '3months' | '6months' | '1year';

// 기간별 필터 컴포넌트
const PeriodFilterComponent = ({ 
  selectedPeriod, 
  onPeriodChange 
}: { 
  selectedPeriod: PeriodFilter; 
  onPeriodChange: (period: PeriodFilter) => void;
}) => {
  const periods = [
    { value: 'all', label: '전체' },
    { value: '1week', label: '1주일' },
    { value: '1month', label: '1개월' },
    { value: '3months', label: '3개월' },
    { value: '6months', label: '6개월' },
    { value: '1year', label: '1년' }
  ] as const;

  return (
    <div className="flex justify-center gap-1 mb-2">
      <div className="grid grid-cols-6 gap-2 w-full max-w-md">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onPeriodChange(period.value)}
            className={`px-2 py-2 rounded-full text-md justify-center font-medium transition-all whitespace-nowrap ${
              selectedPeriod === period.value
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// 구매내역 카드 컴포넌트 - React.memo로 최적화
const ReceiptCard = React.memo(function ReceiptCard({ receipt, index }: { receipt: Receipt; index: number }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2); // 2025 -> 25
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 8 -> 08
    const day = String(date.getDate()).padStart(2, '0'); // 5 -> 05
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-3"
    >
      <Link href={`/receipts/${receipt.id}`}>
        <div 
          className="p-4 cursor-pointertransition-all"
        >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ReceiptIcon className="w-6 h-6" style={{ color: 'var(--sobi-green)' }} />
            <div>
              <h3 className="text-lg font-semibold">{formatDate(receipt.purchasedAt).split(' ')[0]} 영수증</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: 'var(--sobi-green)' }}>
              {receipt.totalAmount?.toLocaleString() || '0'}원
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              총 {receipt.totalCount || 0}개 상품
            </div>
          </div>
        </div>



        </div>
      </Link>
    </motion.div>
  );
});

export default function ReceiptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, accessToken: token } = useAuth();
  const { data, isLoading, error } = useReceipts(token);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('all');
  
  // 페이지네이션 관련 상태
  const itemsPerPage = 5; // 한 페이지당 5개의 영수증
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // 백엔드 데이터를 프론트엔드 형식으로 변환
  console.log('=== 데이터 변환 시작 ===');
  console.log('원본 data:', data);
  
  const receipts = (data?.receipts || []).map((receipt: Receipt, index: number) => {
    console.log(`\n--- Receipt ${index + 1} 변환 ---`);
    console.log('원본 receipt:', receipt);
    console.log('purchasedProducts:', receipt.purchasedProducts);
    
    // purchasedProducts를 items로 변환하고 총액, 총 개수 계산
    const items = receipt.purchasedProducts?.map((purchasedProduct, itemIndex) => {
      console.log(`  상품 ${itemIndex + 1}:`, purchasedProduct);
      return {
        productId: purchasedProduct.product.id,
        productName: purchasedProduct.product.name,
        productPrice: purchasedProduct.product.price,
        quantity: purchasedProduct.quantity,
        totalPrice: purchasedProduct.product.price * purchasedProduct.quantity,
        imageUrl: purchasedProduct.product.imageUrl
      };
    }) || [];

    console.log('변환된 items:', items);

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    console.log('총액:', totalAmount, '총 개수:', totalCount);

    return {
      ...receipt,
      items,
      totalAmount,
      totalCount
    };
  });

  console.log('\n=== 최종 변환 결과 ===');
  console.log('변환된 receipts:', receipts);
  console.log('========================');

  // 날짜순 정렬 및 기간별 필터링 - 성능 최적화
  const filteredAndSortedReceipts = useMemo(() => {
    // 데이터가 없으면 빈 배열 반환
    if (!receipts || receipts.length === 0) {
      return [];
    }

    // 1. 기간별 필터링 (정렬 전에 필터링하여 성능 향상)
    let filteredReceipts = receipts;
    
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (selectedPeriod) {
        case '1week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '1month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          filterDate.setMonth(now.getMonth() - 6);
          break;
        case '1year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredReceipts = receipts.filter(receipt => 
        new Date(receipt.purchasedAt) >= filterDate
      );
    }

    // 2. 날짜순 정렬 (최신순 - 가장 최근 것부터)
    return filteredReceipts.sort((a, b) => 
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    );
  }, [receipts, selectedPeriod]);

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedReceipts.length / itemsPerPage));
  const pagedReceipts = filteredAndSortedReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 페이지 이동 함수
  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('page', String(page));
    router.push(`?${params.toString()}`);
  };

  console.log('필터링된 receipts:', filteredAndSortedReceipts);

  // 통계 계산 최적화
  const statistics = useMemo(() => {
    const totalCount = filteredAndSortedReceipts.length;
    const totalAmount = filteredAndSortedReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
    const totalItems = filteredAndSortedReceipts.reduce((sum, receipt) => sum + (receipt.totalCount || 0), 0);
    
    return {
      totalCount,
      totalAmount,
      totalItems
    };
  }, [filteredAndSortedReceipts]);

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
        <div className="text-lg font-semibold text-[var(--foreground)]">구매내역을 불러오는 중...</div>
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
          {error.message || '구매내역을 불러오는 중 오류가 발생했습니다.'}
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

  return (
    <main className="min-h-screen py-10 pb-32 flex flex-col items-center"
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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--sobi-green)' }}>
            구매내역
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            나의 쇼핑 기록을 확인해보세요
          </p>
        </div>

        {/* 기간별 필터 */}
        <div className="mb-4 p-4 rounded-lg">
          <PeriodFilterComponent 
            selectedPeriod={selectedPeriod} 
            onPeriodChange={setSelectedPeriod} 
          />
        </div>

        {/* 통계 정보 */}
        <div className="mb-2 p-4 relative"
        >
          <div className="relative">
            {/* 빨간색 손그림 테두리 */}
            <div 
              className="absolute inset-0 border-2 border-[var(--sobi-green)] rounded-sm"
              style={{
                borderStyle: 'solid',
                borderWidth: '2px',
                background: 'transparent',
                boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.1)',
              }}
            />
            
            {/* 제목 영역 - 테두리 위에 겹치도록 */}
            <div className="relative z-10 bg-white px-4 py-1 rounded-full inline-block mx-auto mb-4 flex justify-center"
                 style={{ 
                   marginTop: '-12px',
                   left: '50%',
                   transform: 'translateX(-50%) translateY(-50%)'
                 }}>
              <h2 className="text-lg font-semibold text-center text-black">
                구매 통계
              </h2>
            </div>
            
            {/* 통계 내용 */}
            <div className="pt-4 pb-2 px-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-1">
                <div className="flex justify-between items-center p-1"
                >
                  <span className="text-md" style={{ color: 'var(--text-secondary)' }}>총 결제 횟수</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--sobi-green)' }}>
                    {statistics.totalCount}회
                  </span>
                </div>
                <div className="flex justify-between items-center p-1"
                >
                  <span className="text-md" style={{ color: 'var(--text-secondary)' }}>총 구매 금액</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--sobi-green)' }}>
                    {statistics.totalAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between items-center p-1"
                >
                  <span className="text-md" style={{ color: 'var(--text-secondary)' }}>총 구매 상품</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--sobi-green)' }}>
                    {statistics.totalItems}개
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 구매내역 목록 */}
        <div className="p-4 rounded-lg"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          {pagedReceipts.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                아직 구매내역이 없습니다.
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
              {pagedReceipts.map((receipt, index) => (
                <ReceiptCard key={receipt.id} receipt={receipt} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <nav className="flex items-center gap-1 mt-4 mb-10 justify-center">
            <button
              className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
              disabled={currentPage === 1}
              onClick={() => gotoPage(currentPage - 1)}
              style={{ 
                opacity: currentPage === 1 ? 0.4 : 1, 
                pointerEvents: currentPage === 1 ? 'none' : undefined,
                color: 'var(--sobi-green)'
              }}>
              <ChevronLeft strokeWidth={1.5} />
            </button>
            {(() => {
              const pageNumbers = []
              let start = Math.max(1, currentPage - 2)
              let end = Math.min(totalPages, currentPage + 2)
              if (end - start < 4) {
                if (start === 1) end = Math.min(totalPages, start + 4)
                else if (end === totalPages) start = Math.max(1, end - 4)
              }
              for (let i = start; i <= end; i++) {
                pageNumbers.push(i)
              }
              return pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  className={`px-2.5 py-1 rounded-full font-medium
                    ${pageNum === currentPage ? 'text-white' : 'text-[var(--foreground)]'}
                  `}
                  style={{
                    backgroundColor: pageNum === currentPage ? 'var(--sobi-green)' : 'transparent',
                  }}
                  onClick={() => gotoPage(pageNum)}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >{pageNum}</button>
              ))
            })()}
            <button
              className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
              disabled={currentPage === totalPages}
              onClick={() => gotoPage(currentPage + 1)}
              style={{ 
                opacity: currentPage === totalPages ? 0.4 : 1, 
                pointerEvents: currentPage === totalPages ? 'none' : undefined,
                color: 'var(--sobi-green)'
              }}>
              <ChevronRight strokeWidth={1.5} />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
} 