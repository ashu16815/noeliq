import { useState } from 'react'
import { Package, MapPin, Sparkles, AlertCircle, Eye, EyeOff, MessageSquare } from 'lucide-react'
import { AskResponse } from '../lib/apiClient'
import { motion } from 'framer-motion'
import ProductHeader from './ProductHeader'
import CustomerVoicePanel from './CustomerVoicePanel'
import ComparisonPanel from './ComparisonPanel'
import Accordion from './Accordion'

interface NoelIQBubbleProps {
  answer: AskResponse
  customerView?: boolean
  onToggleView?: () => void
}

export default function NoelIQBubble({ answer, customerView = false, onToggleView }: NoelIQBubbleProps) {
  const [showCustomerMode, setShowCustomerMode] = useState(customerView)

  const toggleView = () => {
    setShowCustomerMode(!showCustomerMode)
    if (onToggleView) onToggleView()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 mb-6"
    >
      {/* NoelIQ Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-noel-red flex items-center justify-center text-white font-bold text-lg">
        N
      </div>

      {/* Message Card */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 max-w-3xl">
        {/* 1. Product Header */}
        {!showCustomerMode && answer.product_metadata && (
          <ProductHeader metadata={answer.product_metadata} />
        )}

        {/* 2. Summary - Top Section */}
        <div className="mb-4">
          <p className="text-lg font-semibold text-noel-dark leading-relaxed">
            {answer.summary}
          </p>
        </div>

        {/* 3. Key Points */}
        {answer.key_points && answer.key_points.length > 0 && (
          <div className="mb-4 space-y-2">
            {answer.key_points.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-noel-gold mt-1 flex-shrink-0" />
                <p className="text-noel-dark text-sm">{point}</p>
              </div>
            ))}
          </div>
        )}

        {/* 4. Customer Voice Panel */}
        {!showCustomerMode && answer.customer_voice && (
          <CustomerVoicePanel customerVoice={answer.customer_voice} />
        )}

        {/* 4b. Comparison Panel */}
        {!showCustomerMode && answer.comparison_voice && answer.comparison_voice.enabled && (
          <ComparisonPanel comparisonVoice={answer.comparison_voice} />
        )}

        {/* Attachments Block */}
        {!showCustomerMode && answer.attachments && answer.attachments.length > 0 && (
          <div className="mb-4 p-3 bg-noel-gold/10 rounded-lg border border-noel-gold/20">
            <p className="text-xs font-medium text-noel-dark mb-2">Most people also pick up:</p>
            <div className="space-y-2">
              {answer.attachments.map((att, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-noel-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-noel-dark">{att.name}</p>
                    <p className="text-xs text-gray-600">{att.why_sell}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer-friendly attachments */}
        {showCustomerMode && answer.attachments && answer.attachments.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-noel-dark mb-2">You may also want:</p>
            <div className="space-y-2">
              {answer.attachments.map((att, idx) => (
                <p key={idx} className="text-sm text-gray-700">
                  <span className="font-medium">{att.name}</span> — {att.why_sell.replace(/attach/i, 'add').replace(/sell/i, 'include')}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Stock & Fulfilment */}
        {answer.stock_and_fulfilment && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-noel-red" />
              <p className="text-sm font-semibold text-noel-dark">Stock & Availability</p>
            </div>
            
            {/* This Store Stock */}
            <div className="mb-3">
              {answer.stock_and_fulfilment.this_store_qty !== null ? (
                <div className="flex items-center gap-2">
                  {answer.stock_and_fulfilment.this_store_qty > 0 ? (
                    <>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <p className="text-sm font-medium text-green-700">
                        {answer.stock_and_fulfilment.this_store_qty} available in this store
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <p className="text-sm font-medium text-red-700">Out of stock in this store</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <p className="text-sm text-gray-600">
                    {answer.stock_and_fulfilment.fulfilment_summary || 
                     (answer.stock_and_fulfilment.nearby?.length > 0 
                       ? 'Check nearby stores for availability'
                       : 'Select a store to check availability')}
                  </p>
                </div>
              )}
            </div>

            {/* Nearby Stores */}
            {answer.stock_and_fulfilment.nearby && answer.stock_and_fulfilment.nearby.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-noel-red" />
                  Nearby stores:
                </p>
                <div className="space-y-2">
                  {answer.stock_and_fulfilment.nearby.map((store, idx) => (
                    <div key={idx} className="flex items-start justify-between bg-white p-2 rounded border border-gray-200">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-noel-dark">{store.store_name}</p>
                        {store.fulfilment_option && (
                          <p className="text-xs text-gray-600 mt-0.5">{store.fulfilment_option}</p>
                        )}
                        {!store.fulfilment_option && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">Check availability</p>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-semibold text-green-700">{store.qty} available</p>
                        <p className="text-xs text-gray-500">{store.distance_km?.toFixed(1) || '?'} km</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Helpful message if no store selected - only show if message suggests selecting a store */}
            {answer.stock_and_fulfilment.this_store_qty === null && 
             (!answer.stock_and_fulfilment.nearby || answer.stock_and_fulfilment.nearby.length === 0) &&
             answer.stock_and_fulfilment.fulfilment_summary?.toLowerCase().includes('select a store') && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <p className="text-xs text-gray-600 italic">
                  💡 Select a store from the header to see availability
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alternative if OOS */}
        {answer.alternative_if_oos && answer.alternative_if_oos.alt_sku && (
          <div className="mb-4 p-3 bg-noel-gold/10 rounded-lg border border-noel-gold/30">
            <p className="text-sm font-semibold text-noel-dark mb-1">Alternative Available:</p>
            <p className="text-sm text-noel-dark mb-2">{answer.alternative_if_oos.alt_name}</p>
            {answer.alternative_if_oos.why_this_alt && (
              <p className="text-xs text-gray-700 mb-2">{answer.alternative_if_oos.why_this_alt}</p>
            )}
            {answer.alternative_if_oos.key_diff && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Key difference:</span> {answer.alternative_if_oos.key_diff}
              </p>
            )}
          </div>
        )}

        {/* Sentiment Note */}
        {answer.sentiment_note && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-700 italic">{answer.sentiment_note}</p>
          </div>
        )}

        {/* 7. Progressive Disclosure - Specs, Warranty, Technical Notes */}
        {!showCustomerMode && (
          <div className="mb-4 space-y-2">
            {answer.specs_fields && Object.keys(answer.specs_fields).length > 0 && (
              <Accordion title="Specs & Details" defaultOpen={false}>
                <div className="space-y-2">
                  {Object.entries(answer.specs_fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">{key}:</span>
                      <span className="text-sm text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
            
            {answer.warranty_summary && (
              <Accordion title="Warranty & Returns" defaultOpen={false}>
                <p className="text-sm text-gray-700">{answer.warranty_summary}</p>
              </Accordion>
            )}
            
            {answer.technical_notes && answer.technical_notes.length > 0 && (
              <Accordion title="Technical Notes" defaultOpen={false}>
                <ul className="space-y-1">
                  {answer.technical_notes.map((note, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </Accordion>
            )}
          </div>
        )}

        {/* 8. Sales Script (Staff only) */}
        {!showCustomerMode && answer.sales_script && answer.sales_script.lines && answer.sales_script.lines.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-green-600" />
              <p className="text-xs font-semibold text-gray-700">Sales script</p>
            </div>
            <div className="space-y-1">
              {answer.sales_script.lines.map((line, idx) => (
                <p key={idx} className="text-sm text-gray-700 italic">"{line}"</p>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Flags (Staff only) */}
        {!showCustomerMode && answer.compliance_flags && answer.compliance_flags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-600">
                {answer.compliance_flags.map((flag, idx) => (
                  <p key={idx}>{flag}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toggle Customer View Button */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={toggleView}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-noel-red transition-colors"
          >
            {showCustomerMode ? (
              <>
                <EyeOff className="w-4 h-4" />
                Show staff view
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show customer view
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

