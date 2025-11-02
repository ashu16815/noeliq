import { useState } from 'react'
import { Settings, MessageSquare } from 'lucide-react'
import AskPanel from '../components/AskPanel'
import ConversationThread from '../components/ConversationThread'
import StoreSelector from '../components/StoreSelector'
import { api, AskResponse } from '../lib/apiClient'

interface Message {
  id: string
  question: string
  sku?: string
  answer?: AskResponse
  timestamp: Date
}

export default function SalesAssistantView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState<string>(() => 
    `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  )

  const handleAsk = async (sku: string, question: string) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Add question to messages immediately
    const newMessage: Message = {
      id: messageId,
      question,
      sku: sku || undefined,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    setIsLoading(true)

    try {
      const answer = await api.ask({
        sku: sku || undefined,
        question,
        conversation_id: conversationId,
        store_id: localStorage.getItem('store_id') || undefined,
      })

      // Update message with answer
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, answer } : msg
        )
      )
    } catch (error: any) {
      console.error('Error asking question:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED',
      })
      // Add error answer
      const errorAnswer: AskResponse = {
        answer_text: "I'm sorry, I encountered an error. Let me check that for you.",
        key_sell_points: [],
        recommended_attachments: [],
        availability: {
          this_store_qty: null,
          nearby: [],
          fulfilment: '',
        },
        alternative_if_oos: {
          alt_sku: null,
          alt_name: null,
          why_this_alt: null,
          key_diff: null,
        },
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
    <div className="min-h-screen bg-noel-dark">
      {/* Header */}
      <header className="bg-noel-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">NoelIQ</h1>
                <p className="text-sm text-red-100">Intelligent Retail Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <AskPanel onAsk={handleAsk} isLoading={isLoading} />
          <ConversationThread messages={messages} />
        </div>
      </main>
    </div>
  )
}

