'use client';

import { useState } from "react";
import { X } from 'lucide-react';

export default function TestForDev() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 z-50 max-w-xs">
      <div 
        className="p-4 rounded-lg shadow-lg backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">개발용 테스트</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 환경 정보 */}
        <div className="mb-3 text-xs text-gray-600">
          <p>프로토콜: {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}</p>
          <p>호스트: {typeof window !== 'undefined' ? window.location.host : 'unknown'}</p>
          <p>환경: {process.env.NODE_ENV}</p>
        </div>


      </div>
    </div>
  );
}
