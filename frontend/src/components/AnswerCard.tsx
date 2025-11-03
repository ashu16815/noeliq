import { CheckCircle2, AlertCircle } from 'lucide-react'
import { AskResponse } from '../lib/apiClient'
import StockBlock from './StockBlock'
import AttachmentsBlock from './AttachmentsBlock'

interface AnswerCardProps {
  answer: AskResponse
}

export default function AnswerCard({ answer }: AnswerCardProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-6 mb-6 space-y-6">
      {/* Main Answer */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle2 className="w-6 h-6 text-noel-red flex-shrink-0 mt-1" />
          <h2 className="text-xl font-semibold text-noel-dark">Answer</h2>
        </div>
        <p className="text-noel-dark leading-relaxed whitespace-pre-line">
          {answer.summary}
        </p>
      </div>

      {/* Key Sell Points */}
      {answer.key_points && answer.key_points.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-noel-dark mb-3">Key Points</h3>
          <ul className="space-y-2">
            {answer.key_points.map((point: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-noel-dark">
                <span className="text-noel-red mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stock Information */}
      <StockBlock
        availability={{
          this_store_qty: answer.stock_and_fulfilment.this_store_qty,
          nearby: answer.stock_and_fulfilment.nearby,
          fulfilment: answer.stock_and_fulfilment.fulfilment_summary,
        }}
        alternative={answer.alternative_if_oos}
      />

      {/* Attachment Recommendations */}
      {answer.attachments && answer.attachments.length > 0 && (
        <AttachmentsBlock attachments={answer.attachments} />
      )}

      {/* Error or Uncertain Response Indicator */}
      {answer.summary.includes('Let me check that for you') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Note:</p>
            <p>NoelIQ couldn't find specific information about this. Please check with a specialist or refer to product documentation.</p>
          </div>
        </div>
      )}
    </div>
  )
}

