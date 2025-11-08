import React from 'react'
import { ShortlistItem } from '../lib/apiClient'

interface ShortlistCardProps {
  item: ShortlistItem
  onFocusProduct: (sku: string) => void
}

export const ShortlistCard: React.FC<ShortlistCardProps> = ({ item, onFocusProduct }) => {
  // Defensive checks to prevent crashes
  if (!item) {
    return null
  }

  const { sku, brand, product_name, model, headline_features, price_band, price_value, price_currency, price_compare, feature_headline, offer_badge } = item
  
  // Ensure we have required fields
  if (!sku) {
    return null
  }

  // Safe defaults for optional fields - only show brand if it exists and is not "Unknown Brand"
  const showBrand = brand && brand !== 'Unknown Brand' && brand.trim().length > 0
  const safeProductName = product_name || `Product ${sku}`
  
  // Format price
  const formattedPrice = price_value != null 
    ? `${price_currency || 'NZ$'}${price_value.toFixed(2)}`
    : null
  const showCompare = price_compare && price_compare > (price_value || 0)

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Title area */}
      <div className="space-y-1">
        {showBrand && (
          <div className="text-xs font-semibold uppercase text-neutral-500">
            {brand}
          </div>
        )}
        <div className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
          {safeProductName}
        </div>
        {/* Price */}
        {formattedPrice && (
          <div className="text-sm font-semibold text-neutral-900 mt-1">
            {showCompare && (
              <span className="mr-2 text-xs text-neutral-400 line-through">
                {price_currency || 'NZ$'}{price_compare.toFixed(2)}
              </span>
            )}
            <span>{formattedPrice}</span>
          </div>
        )}
        {/* Fallback to price_band if price_value is not available */}
        {!formattedPrice && price_band && (
          <div className="text-xs text-emerald-700 font-medium mt-0.5">
            {price_band}
          </div>
        )}
        {/* Feature headline */}
        {feature_headline && (
          <div className="mt-1 text-xs text-neutral-700 line-clamp-2">
            {feature_headline}
          </div>
        )}
        {/* Offer badge */}
        {offer_badge && (
          <div className="mt-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
            {offer_badge}
          </div>
        )}
        {/* Fallback: show headline_features if feature_headline is not available */}
        {!feature_headline && headline_features && headline_features.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-neutral-700">
            {headline_features.slice(0, 2).map((feat, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="mt-0.5 text-[10px]">•</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer row: SKU + button */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-neutral-500">
          SKU <span className="font-mono">{sku}</span>
          {model && <span className="ml-1 text-neutral-400">({model})</span>}
        </div>
        <button
          type="button"
          className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 active:bg-red-800 transition-colors"
          onClick={() => onFocusProduct(sku)}
        >
          Make this my focus product
        </button>
      </div>
    </div>
  )
}
