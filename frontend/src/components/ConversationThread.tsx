import { AskResponse } from '../lib/apiClient'
import AnswerCard from './AnswerCard'

interface Message {
  id: string
  question: string
  sku?: string
  answer?: AskResponse
  timestamp: Date
}

interface ConversationThreadProps {
  messages: Message[]
}

export default function ConversationThread({ messages }: ConversationThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No questions yet. Ask NoelIQ anything about a product!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div key={message.id} className="space-y-4">
          {/* Question */}
          <div className="bg-noel-red/90 border-l-4 border-noel-red p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-white font-medium mb-1">You asked:</p>
                <p className="text-white font-semibold">{message.question}</p>
                {message.sku && (
                  <p className="text-xs text-red-100 mt-2">SKU: {message.sku}</p>
                )}
              </div>
              <span className="text-xs text-red-100">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Answer */}
          {message.answer && (
            <AnswerCard answer={message.answer} />
          )}
        </div>
      ))}
    </div>
  )
}

