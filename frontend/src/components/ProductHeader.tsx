import { Package } from 'lucide-react'
import { ProductMetadata } from '../lib/apiClient'

interface ProductHeaderProps {
  metadata: ProductMetadata
}

export default function ProductHeader({ metadata }: ProductHeaderProps) {
  if (!metadata || !metadata.name) {
    return null
  }

  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-start gap-4">
        {/* Product Image */}
        <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
          {metadata.image_url ? (
            <img
              src={metadata.image_url}
              alt={metadata.name}
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>'
                }
              }}
            />
          ) : (
            <Package className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-noel-dark mb-1">{metadata.name}</h2>
          
          {/* Hero Features */}
          {metadata.hero_features && metadata.hero_features.length > 0 && (
            <p className="text-sm text-gray-600 mb-2">
              {metadata.hero_features.slice(0, 2).join(' • ')}
            </p>
          )}
          
          {/* Price Band */}
          {metadata.price_band && (
            <p className="text-lg font-semibold text-noel-red mb-2">{metadata.price_band}</p>
          )}
          
          {/* SKU */}
          {metadata.sku && (
            <p className="text-xs text-gray-500">SKU: {metadata.sku}</p>
          )}
        </div>
      </div>
    </div>
  )
}

