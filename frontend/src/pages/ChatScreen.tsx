import { useState, useRef, useEffect } from 'react'
import { Settings, MessageSquare } from 'lucide-react'
import StoreSelector from '../components/StoreSelector'
import MessageComposer from '../components/MessageComposer'
import NoelIQBubble from '../components/NoelIQBubble'
import UserBubble from '../components/UserBubble'
import LoadingProgress from '../components/LoadingProgress'
import ContextBar from '../components/ContextBar'
import QuickActionsRow from '../components/QuickActionsRow'
import { ShortlistCard } from '../components/ShortlistCard'
import SuggestionChips from '../components/SuggestionChips'
import ErrorBubble from '../components/ErrorBubble'
import { api, AskResponse } from '../lib/apiClient'

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
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Context state
  const [context, setContext] = useState<{
    product: { name: string; sku: string } | null
    budget: string | null
    useCase: string | null
    store: string | null
  }>({
    product: null,
    budget: null,
    useCase: null,
    store: null,
  })
  
  // Suggestions
  const defaultSuggestions = [
    'Compare this with the next model up',
    'What should I say if customer is worried about battery life?',
    'Suggest accessories for gamers',
    'Show me laptops under $1000',
  ]
  const [suggestions] = useState<string[]>(defaultSuggestions)

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
    setLoadingStartTime(Date.now())

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

      // Update context from answer
      if (answer.product_metadata?.sku && answer.product_metadata?.name) {
        setContext((prev) => ({
          ...prev,
          product: {
            name: answer.product_metadata!.name!,
            sku: answer.product_metadata!.sku!,
          },
        }))
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
      setLoadingStartTime(null)
    }
  }

  const handleQuickAction = async (action: string, data?: any) => {
    let question = ''
    
    switch (action) {
      case 'specs':
        question = `Show me full specifications for SKU ${data.sku}`
        break
      case 'compare':
        question = `Compare SKU ${data.sku} with similar products`
        break
      case 'reviews':
        question = `What do customers say about SKU ${data.sku}?`
        break
      case 'addons':
        question = `What accessories or add-ons work well with SKU ${data.sku}?`
        break
      case 'similar':
        question = `Find similar products to SKU ${data.sku} but cheaper`
        break
      default:
        return
    }
    
    await handleSend(question, data.sku)
  }

  const handleShortlistSelect = async (sku: string) => {
    // Send both SKU and query text for deep dive
    await handleSend(`Tell me more about SKU ${sku}`, sku)
  }

  const handleContextUpdate = async (type: string, value: string) => {
    setContext((prev) => ({
      ...prev,
      [type === 'product' ? 'product' : type === 'budget' ? 'budget' : type === 'use_case' ? 'useCase' : 'store']: 
        type === 'product' ? null : value,
    }))
    
    // Auto-send follow-up query
    let question = ''
    if (type === 'budget') {
      question = `Re-evaluate options with budget ${value}`
    } else if (type === 'use_case') {
      question = `Re-evaluate options for use case: ${value}`
    } else if (type === 'store') {
      localStorage.setItem('store_id', value)
      question = `Update store context to ${value}`
    }
    
    if (question) {
      await handleSend(question)
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    handleSend(suggestion)
  }

  const handleErrorRecovery = async (action: string) => {
    switch (action) {
      case 'retry':
        // Retry last message
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          await handleSend(lastMessage.question, lastMessage.sku)
        }
        break
      case 'similar':
        await handleSend('Show me similar products from the catalogue')
        break
      case 'skip':
        // Skip reviews - just continue
        break
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
              <StoreSelector 
                onStoreChange={(storeName) => {
                  setContext((prev) => ({ ...prev, store: storeName }))
                }}
              />
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
          {/* Context Bar */}
          <ContextBar context={context} onUpdate={handleContextUpdate} />
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm mb-4">Start a conversation with NoelIQ</p>
              <SuggestionChips suggestions={suggestions} onSelect={handleSuggestionSelect} />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  <UserBubble question={message.question} timestamp={message.timestamp} />
                  {message.answer && (
                    <>
                      {/* Shortlist Cards (if present) */}
                      {message.answer.shortlist_items && 
                       Array.isArray(message.answer.shortlist_items) && 
                       message.answer.shortlist_items.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-noel-dark mb-3">Your best options:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {message.answer.shortlist_items
                              .filter(item => item && item.sku) // Filter out invalid items
                              .map((item) => (
                                <ShortlistCard
                                  key={item.sku}
                                  item={item}
                                  onFocusProduct={handleShortlistSelect}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Error Bubble (if error detected) */}
                      {message.answer.summary.includes('encountered an error') && (
                        <ErrorBubble
                          error={message.answer.summary}
                          onRecoveryAction={handleErrorRecovery}
                        />
                      )}
                      
                      {/* Main Answer */}
                      <NoelIQBubble answer={message.answer} />
                      
                      {/* Quick Actions */}
                      <QuickActionsRow
                        answer={message.answer}
                        onAction={handleQuickAction}
                      />
                    </>
                  )}
                  {isLoading && message.id === messages[messages.length - 1]?.id && !message.answer && (
                    <LoadingProgress startTime={loadingStartTime} />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
              
              {/* Suggestions below last message */}
              {messages.length > 0 && !isLoading && (
                <SuggestionChips suggestions={suggestions} onSelect={handleSuggestionSelect} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Composer */}
      <MessageComposer onSend={handleSend} isLoading={isLoading} activeSku={activeSku} />
    </div>
  )
}

