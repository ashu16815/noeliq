import { ThumbsUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { CustomerVoice } from '../lib/apiClient'

interface CustomerVoicePanelProps {
  customerVoice: CustomerVoice
}

export default function CustomerVoicePanel({ customerVoice }: CustomerVoicePanelProps) {
  if (!customerVoice) {
    return null
  }

  const hasContent = 
    (customerVoice.top_pros && Array.isArray(customerVoice.top_pros) && customerVoice.top_pros.length > 0) ||
    (customerVoice.top_cons && Array.isArray(customerVoice.top_cons) && customerVoice.top_cons.length > 0) ||
    (customerVoice.best_for && Array.isArray(customerVoice.best_for) && customerVoice.best_for.length > 0) ||
    (customerVoice.not_ideal_for && Array.isArray(customerVoice.not_ideal_for) && customerVoice.not_ideal_for.length > 0) ||
    (customerVoice.notable_issues && Array.isArray(customerVoice.notable_issues) && customerVoice.notable_issues.length > 0)

  if (!hasContent) {
    return null
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <ThumbsUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-noel-dark">What customers are saying</h3>
        {customerVoice.overall_sentiment && (
          <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {customerVoice.overall_sentiment}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Pros */}
        {customerVoice.top_pros && Array.isArray(customerVoice.top_pros) && customerVoice.top_pros.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h4 className="text-xs font-medium text-gray-700">Pros</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {customerVoice.top_pros.map((pro, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {customerVoice.top_cons && Array.isArray(customerVoice.top_cons) && customerVoice.top_cons.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-medium text-gray-700">Cons</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {customerVoice.top_cons.map((con, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Best For */}
        {customerVoice.best_for && Array.isArray(customerVoice.best_for) && customerVoice.best_for.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-medium text-gray-700">Best for</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {customerVoice.best_for.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Not Ideal For */}
        {customerVoice.not_ideal_for && Array.isArray(customerVoice.not_ideal_for) && customerVoice.not_ideal_for.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-medium text-gray-700">Not ideal for</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {customerVoice.not_ideal_for.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notable Issues */}
        {customerVoice.notable_issues && Array.isArray(customerVoice.notable_issues) && customerVoice.notable_issues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-medium text-gray-700">Notable issues</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {customerVoice.notable_issues.map((issue, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

