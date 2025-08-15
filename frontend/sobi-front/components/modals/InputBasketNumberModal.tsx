'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface InputBasketNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (basketNumber: string) => void;
}

export default function InputBasketNumberModal({ isOpen, onClose, onConnect }: InputBasketNumberModalProps) {
  const [basketNumber, setBasketNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 input에 포커스
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (basketNumber.trim() && !isConnecting) {
      setIsConnecting(true);
      try {
        await onConnect(basketNumber.trim());
        setBasketNumber('');
      } finally {
        setIsConnecting(false);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-[70] bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        className="w-full max-w-xs sm:max-w-sm px-6 py-8 rounded-3xl shadow-2xl relative"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
          color: 'var(--foreground)',
          transition: 'background 0.6s, color 0.6s, border 0.6s',
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ 
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full transition-colors"
          onClick={onClose}
          type="button"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        {/* 헤더 */}
        <div className="mb-6 text-center">
          <div className="text-xl font-bold mb-2">
            SOBI 번호 입력
          </div>
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
            QR 코드가 인식되지 않는 경우<br />
            SOBI 번호를 직접 입력해주세요
          </div>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="basketNumber" className="block text-sm font-medium text-[var(--foreground)] mb-3">
              SOBI 번호
            </label>
            <input
              ref={inputRef}
              id="basketNumber"
              type="text"
              value={basketNumber}
              onChange={(e) => setBasketNumber(e.target.value)}
              placeholder="예: 1, 2, 3..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--sobi-green)] focus:border-transparent transition-all text-center text-lg font-medium"
              autoComplete="off"
              disabled={isConnecting}
            />
          </div>
          
          {/* 버튼 섹션 */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={!basketNumber.trim() || isConnecting}
              className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: basketNumber.trim() && !isConnecting
                  ? 'linear-gradient(135deg, var(--sobi-green) 0%, rgba(45, 192, 126, 0.8) 100%)'
                  : 'var(--input-background)',
                color: basketNumber.trim() && !isConnecting ? 'white' : 'var(--text-secondary)'
              }}
            >
              {isConnecting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mr-2"></div>
                  연결 중...
                </div>
              ) : (
                'SOBI 연결'
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl py-3 text-base font-medium transition-all border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)] hover:bg-[var(--input-background-hover)]"
              disabled={isConnecting}
            >
              취소
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
