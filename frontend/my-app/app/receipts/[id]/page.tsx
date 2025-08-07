'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/utils/hooks/useAuth';
import { useReceipts, Receipt } from '@/utils/hooks/useReceipts';
import { Receipt as ReceiptIcon, Printer } from 'lucide-react';
import { IoReceiptOutline } from "react-icons/io5";
import { FaExclamationTriangle as FaExclamationTriangleIcon } from 'react-icons/fa';

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoggedIn, accessToken: token } = useAuth();
  const { data, isLoading, error } = useReceipts(token);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const receiptId = params.id as string;

  useEffect(() => {
    if (data?.receipts) {
      const foundReceipt = data.receipts.find((r: Receipt) => r.id.toString() === receiptId);
      if (foundReceipt) {
        // 데이터 변환
        const items = foundReceipt.purchasedProducts?.map((purchasedProduct) => ({
          productId: purchasedProduct.product.id,
          productName: purchasedProduct.product.name,
          productPrice: purchasedProduct.product.price,
          quantity: purchasedProduct.quantity,
          totalPrice: purchasedProduct.product.price * purchasedProduct.quantity,
          imageUrl: purchasedProduct.product.imageUrl
        })) || [];

        const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

        setReceipt({
          ...foundReceipt,
          items,
          totalAmount,
          totalCount
        });
      }
    }
  }, [data, receiptId]);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  // 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-12 bg-white"
        style={{ 
          color: 'var(--foreground)' 
        }}
      >
        <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold">구매내역을 불러오는 중...</div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-10 text-center bg-white"
        style={{ 
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

  // 구매내역을 찾을 수 없음
  if (!isLoading && !receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-10 text-center bg-white"
        style={{ 
          color: 'var(--foreground)' 
        }}
      >
        <ReceiptIcon className="text-gray-400 text-5xl mb-3" />
        <div className="font-bold text-lg text-gray-500 mb-2">
          구매내역을 찾을 수 없습니다
        </div>
        <div className="text-gray-400 text-base mb-4">
          요청하신 구매내역이 존재하지 않습니다.
        </div>
        <Link
          href="/receipts"
          className="inline-block px-6 py-2 bg-green-600 text-white rounded-full shadow hover:bg-green-700 transition-all"
        >
          구매내역 목록으로
        </Link>
      </div>
    );
  }

  // receipt가 null인 경우 처리
  if (!receipt) {
    return null;
  }

  return (
    <main className="min-h-screen py-8 pb-24 flex flex-col items-center bg-white print:py-0 print:pb-0 print:min-h-auto"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-2xl px-4 pt-5 print:px-0 print:pt-0">
        {/* 영수증 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="receipt-container bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none print:bg-white print:min-h-auto print:flex print:flex-col print:justify-start print:mb-0"
        >
          {/* 영수증 헤더 */}
          <div className="bg-green-600 text-white p-6 text-center">
            <IoReceiptOutline  className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-2">
              <span className="typewriter-text">SOBI 영수증</span>
            </h2>
          </div>

          {/* 구매 정보 */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">영수증 번호:</span>
                <div className="font-semibold">#{receipt.id}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">구매일시:</span>
                <div className="font-semibold">{formatDate(receipt.purchasedAt)}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">구매 시간:</span>
                <div className="font-semibold">{formatTime(receipt.purchasedAt)}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">총 상품 수:</span>
                <div className="font-semibold">{receipt.totalCount || 0}개</div>
              </div>
            </div>
          </div>

          {/* 상품 목록 */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              구매 상품
            </h3>
            <div className="space-y-4">
              {receipt.items?.map((item, index) => (
                <div 
                  key={`${item.productId}-${index}`}
                  className="flex items-center gap-4 p-4 rounded-lg transition-all"
                >
                  <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover hover:scale-105 transition-transform cursor-pointer"
                        sizes="64px"
                      />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/products/${item.productId}`}
                      className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.quantity}개 × {item.productPrice.toLocaleString()}원
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg" style={{ color: 'var(--sobi-green)' }}>
                      {item.totalPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 총액 */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>총 결제 금액</span>
              <span style={{ color: 'var(--sobi-green)' }}>
                {receipt.totalAmount?.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 푸터 */}
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mt-1">환불 시 해당 영수증을 지참하시고<br />
            직원에게 환불 신청 바랍니다</p>
            <span className="text-[12px] text-red-500">환불은 영수증 발행 일자 기준 14일 이내 가능합니다</span>
          </div>
        </motion.div>

        {/* 액션 버튼 */}
        <div className="mt-6 flex justify-center gap-4 print:hidden print-button">
          <button
            onClick={() => {
              // 파일명 생성: SOBI_영수증_날짜_영수증번호.pdf
              const date = new Date(receipt.purchasedAt);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const fileName = `SOBI_영수증_${year}${month}${day}_#${receipt.id}.pdf`;
              
              // 파일명을 클립보드에 복사
              navigator.clipboard.writeText(fileName).then(() => {
                // 사용자에게 안내 메시지 표시
                const message = `PDF 저장 시 파일명을 다음과 같이 지정해주세요:\n\n${fileName}\n\n파일명이 클립보드에 복사되었습니다.`;
                alert(message);
                
                // PDF 인쇄 다이얼로그 열기
                window.print();
              }).catch(() => {
                // 클립보드 복사 실패 시에도 PDF 인쇄는 진행
                alert(`PDF 저장 시 파일명을 "${fileName}"로 지정해주세요!`);
                window.print();
              });
            }}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            PDF 저장
          </button>
        </div>
      </div>
    </main>
  );
} 