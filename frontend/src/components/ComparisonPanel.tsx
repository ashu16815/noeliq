import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ComparisonVoice } from '../lib/apiClient'

interface ComparisonPanelProps {
  comparisonVoice: ComparisonVoice
}

export default function ComparisonPanel({ comparisonVoice }: ComparisonPanelProps) {
  if (!comparisonVoice || !comparisonVoice.enabled) {
    return null
  }

  const hasContent = 
    comparisonVoice.headline_summary ||
    (comparisonVoice.areas_better_left && comparisonVoice.areas_better_left.length > 0) ||
    (comparisonVoice.areas_better_right && comparisonVoice.areas_better_right.length > 0) ||
    (comparisonVoice.recommendation_by_use_case && comparisonVoice.recommendation_by_use_case.length > 0)

  if (!hasContent) {
    return null
  }

  return (
    <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-noel-dark">Comparison Summary</h3>
      </div>

      <div className="space-y-4">
        {/* Headline Summary */}
        {comparisonVoice.headline_summary && (
          <p className="text-sm text-gray-700 mb-4 italic">{comparisonVoice.headline_summary}</p>
        )}

        {/* Areas Better for Left Product */}
        {comparisonVoice.areas_better_left && comparisonVoice.areas_better_left.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="text-xs font-medium text-gray-700">First product better at</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {comparisonVoice.areas_better_left.map((area, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas Better for Right Product */}
        {comparisonVoice.areas_better_right && comparisonVoice.areas_better_right.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-medium text-gray-700">Second product better at</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {comparisonVoice.areas_better_right.map((area, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tie/Neutral Areas */}
        {comparisonVoice.tie_or_neutral_areas && comparisonVoice.tie_or_neutral_areas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Minus className="w-4 h-4 text-gray-600" />
              <h4 className="text-xs font-medium text-gray-700">Similar in</h4>
            </div>
            <ul className="space-y-1 ml-6">
              {comparisonVoice.tie_or_neutral_areas.map((area, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-600 mt-1">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations by Use Case */}
        {comparisonVoice.recommendation_by_use_case && comparisonVoice.recommendation_by_use_case.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Recommendations by use case</h4>
            <div className="space-y-2 ml-2">
              {comparisonVoice.recommendation_by_use_case.map((rec, idx) => (
                <div key={idx} className="text-sm bg-white p-2 rounded border border-gray-200">
                  <p className="font-medium text-gray-800">{rec.use_case}:</p>
                  <p className="text-gray-700 mt-1">
                    <span className="font-medium">
                      {rec.better_choice === 'left' ? 'First product' : rec.better_choice === 'right' ? 'Second product' : 'Either product'}
                    </span>
                    {' — '}
                    {rec.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

