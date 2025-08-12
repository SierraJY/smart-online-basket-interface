'use client'

import { useState, useEffect, useRef } from 'react'
import { X, User } from 'lucide-react'
import { RiRobot3Line } from "react-icons/ri"
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/utils/hooks/useAuth'

interface ChatbotModalProps {
  onClose: () => void
}

interface Message {
  id: number
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

export default function ChatbotModal({ onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { isGuestUser, isLoggedIn } = useAuth()
  
  // 디버깅용 로그
  useEffect(() => {
    console.log('[ChatbotModal] isGuestUser:', isGuestUser, 'isLoggedIn:', isLoggedIn)
  }, [isGuestUser, isLoggedIn])

  // 질문 목록
  const questions = [
    {
      id: 1,
      question: 'SOBI가 뭐야?',
      answer: 'SOBI는 Smart Online Basket Interface의 약자로, 보다 편리한 오프라인 쇼핑을 위한 서비스입니다'
    },
    {
      id: 2,
      question: 'SOBI AI?',
      answer: 'SOBI AI는 고객님의 정보와 소비패턴, 찜 상품 등을 분석하며 추천 상품을 제공하는 AI 서비스입니다'
    },
    {
      id: 3,
      question: '에낙은 안 팔아?',
      answer: '죽어'
    },
    {
      id: 4,
      question: 'SOBI는 어떻게 사용해?',
      answer: 'SOBI에 있는 QR코드를 스캔하면 앱과 연동되며 구매할 상품을 담으면 자동으로 상품이 추가됩니다'
    },
    {
      id: 5,
      question: '환불은 어떻게 해야 돼?',
      answer: '구매내역에 있는 영수증을 통해 지정된 기간 내에 환불을 신청할 수 있어요!'
    }
  ]

  // 자동 스크롤 기능
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }

  // 메시지 변경 시 자동 스크롤
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom()
    }, 100) // 약간의 딜레이로 렌더링 완료 후 스크롤

    return () => clearTimeout(timer)
  }, [messages, isWaitingForResponse])

  // 질문 클릭 핸들러
  const handleQuestionClick = (questionData: typeof questions[0]) => {
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: questionData.question,
      timestamp: new Date()
    }

    // 기존 메시지에 사용자 메시지 추가
    setMessages(prev => [...prev, userMessage])
    setIsWaitingForResponse(true)

    // 봇 응답은 1초 후에 추가
    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: questionData.answer,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMessage])
      setIsWaitingForResponse(false)
    }, 1000)
  }

  // 초기화
  const handleReset = () => {
    setMessages([])
    setIsWaitingForResponse(false)
  }

  return (
    <div 
      className="w-full max-w-md max-h-full rounded-2xl shadow-2xl flex flex-col"
      style={{
        backgroundColor: 'var(--background)',
        border: '1px solid var(--border)',
        height: 'min(85vh, 650px)' // 화면 높이의 90% 또는 700px 중 작은 값
      }}
      onClick={e => e.stopPropagation()}
    >
        {/* 헤더 */}
        <div 
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-full"
              style={{ backgroundColor: 'var(--sobi-green)' }}
            >
              <RiRobot3Line size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">SOBI 챗봇</h3>
              <p className="text-xs text-[var(--text-secondary)]">궁금한 것을 물어보세요!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 relative overflow-hidden">
          {/* 상단 그라데이션 효과 */}
          <div 
            className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to bottom, var(--background) 0%, var(--background) 20%, transparent 100%)`
            }}
          />
          
          <div ref={messagesContainerRef} className="h-full overflow-y-auto p-4 space-y-4">
          {/* 초기 환영 메시지 */}
          {messages.length === 0 && (
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--sobi-green)' }}
              >
                <RiRobot3Line size={16} className="text-white" />
              </div>
              <div
                className="max-w-[80%] p-3 rounded-2xl rounded-tl-md"
                style={{ 
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--foreground)'
                }}
              >
                안녕하세요! SOBI 챗봇입니다. 궁금한 것을 선택해주세요! 😊
              </div>
            </div>
          )}

          {/* 메시지 목록 */}
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* 아바타 */}
                <div 
                  className={`p-2 rounded-full flex-shrink-0 ${
                    message.type === 'user' && !isLoggedIn 
                      ? 'border-2 border-[var(--sobi-green)]' 
                      : ''
                  }`}
                  style={{
                    backgroundColor: message.type === 'user' 
                      ? (!isLoggedIn 
                          ? 'var(--background)' 
                          : (isGuestUser ? 'var(--guest-orange)' : 'var(--sobi-green)')
                        )
                      : 'var(--sobi-green)'
                  }}
                >
                  {message.type === 'user' ? (
                    <User 
                      size={16} 
                      className={!isLoggedIn ? "text-[var(--foreground)]" : "text-white"} 
                      strokeWidth={1.5} 
                    />
                  ) : (
                    <RiRobot3Line size={16} className="text-white" />
                  )}
                </div>

                {/* 메시지 내용 */}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user' 
                      ? 'rounded-tr-md bg-[var(--sobi-green)] text-white' 
                      : 'rounded-tl-md'
                  }`}
                  style={message.type === 'bot' ? { 
                    backgroundColor: 'var(--input-background)',
                    color: 'var(--foreground)'
                  } : {}}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 봇 응답 대기 중 표시 */}
          {isWaitingForResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div 
                className="p-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--sobi-green)' }}
              >
                <RiRobot3Line size={16} className="text-white" />
              </div>
              <div
                className="max-w-[80%] p-3 rounded-2xl rounded-tl-md"
                style={{ 
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--foreground)'
                }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 스크롤 앵커 */}
          <div ref={messagesEndRef} />
          </div>

          {/* 하단 그라데이션 효과 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to top, var(--background) 0%, var(--background) 20%, transparent 100%)`
            }}
          />
        </div>

        {/* 질문 선택 영역 */}
        <div className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {messages.length === 0 ? "질문을 선택해주세요" : "다른 질문이 있으신가요?"}
            </p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q) => (
                <motion.button
                  key={q.id}
                  onClick={() => handleQuestionClick(q)}
                  className="inline-block text-left p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--sobi-green)',
                    color: 'white'
                  }}
                  disabled={isWaitingForResponse}
                  whileHover={{ scale: isWaitingForResponse ? 1 : 1.02 }}
                  whileTap={{ scale: isWaitingForResponse ? 1 : 0.98 }}
                >
                  <div className="text-sm font-medium whitespace-nowrap">{q.question}</div>
                </motion.button>
              ))}
            </div>
            
            {/* 대화 초기화 버튼 (메시지가 있을 때만 표시) */}
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="w-full p-2 mt-3 rounded-lg text-sm transition-all duration-200 hover:opacity-80"
                style={{ 
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)'
                }}
              >
                대화 초기화
              </button>
            )}
          </div>
        </div>
    </div>
  )
}
