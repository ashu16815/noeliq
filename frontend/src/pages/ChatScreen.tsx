import { useState, useRef, useEffect } from 'react'
import { Settings, MessageSquare, Package } from 'lucide-react'
import StoreSelector from '../components/StoreSelector'
import MessageComposer from '../components/MessageComposer'
import NoelIQBubble from '../components/NoelIQBubble'
import UserBubble from '../components/UserBubble'
import { api, AskResponse } from '../lib/apiClient'
import { motion } from 'framer-motion'

interface Message {
  id: string
  question: string
  sku?: string
  answer?: AskResponse
  timestamp: Date
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [activeSku, setActiveSku] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (question: string, sku?: string) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Update active SKU if provided
    if (sku) {
      setActiveSku(sku)
    }
    
    // Add question to messages immediately
    const newMessage: Message = {
      id: messageId,
      question,
      sku: sku || activeSku || undefined,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    setIsLoading(true)

    try {
      // Get store_id from localStorage (set by StoreSelector)
      const storeId = localStorage.getItem('store_id')
      
      const answer = await api.ask({
        sku: sku || activeSku || undefined,
        question,
        conversation_id: conversationId || undefined,
        store_id: storeId || undefined,
      })
      
      console.log('[ChatScreen] Store ID sent:', storeId || 'not set')

      // Update conversation ID from response
      if (answer.conversation_id) {
        setConversationId(answer.conversation_id)
      }

      // Update active SKU from answer if available
      if (sku || activeSku) {
        setActiveSku(sku || activeSku || null)
      }

      // Update message with answer
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, answer } : msg
        )
      )
    } catch (error: any) {
      console.error('Error asking question:', error)
      
      // Add error answer
      const errorAnswer: AskResponse = {
        conversation_id: conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        summary: "I'm sorry, I encountered an error. Let me check that for you.",
        key_points: [],
        attachments: [],
        stock_and_fulfilment: {
          this_store_qty: null,
          nearby: [],
          fulfilment_summary: '',
        },
        alternative_if_oos: {
          alt_sku: null,
          alt_name: null,
          why_this_alt: null,
          key_diff: null,
        },
        sentiment_note: null,
        compliance_flags: [],
        citations: [],
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, answer: errorAnswer } : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-noel-red text-white shadow-lg flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">NoelIQ</h1>
                <p className="text-xs text-red-100">Sales Floor Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StoreSelector />
              <button
                onClick={() => window.location.href = '/admin'}
                className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                title="Admin Dashboard"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm">Start a conversation with NoelIQ</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  <UserBubble question={message.question} timestamp={message.timestamp} />
                  {message.answer && (
                    <NoelIQBubble answer={message.answer} />
                  )}
                  {isLoading && message.id === messages[messages.length - 1]?.id && !message.answer && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Composer */}
      <MessageComposer onSend={handleSend} isLoading={isLoading} activeSku={activeSku} />
    </div>
  )
}

