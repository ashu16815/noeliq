import { Package, MapPin, CheckCircle2, XCircle } from 'lucide-react'
import { Availability, AlternativeIfOOS, AvailabilityNearby } from '../lib/apiClient'

interface StockBlockProps {
  availability: Availability
  alternative?: AlternativeIfOOS | null
}

export default function StockBlock({ availability, alternative }: StockBlockProps) {
  const isInStock = availability.this_store_qty !== null && availability.this_store_qty > 0
  const hasStoreInfo = availability.this_store_qty !== null

  return (
    <div className="border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-noel-red" />
        <h3 className="text-lg font-medium text-noel-dark">Stock & Availability</h3>
      </div>

      <div className="space-y-4">
        {/* This Store */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {!hasStoreInfo ? (
              <Package className="w-5 h-5 text-gray-400" />
            ) : isInStock ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className="font-medium text-noel-dark">This Store</p>
              <p className="text-sm text-gray-600">
                {!hasStoreInfo 
                  ? 'No store selected. Set store_id in localStorage to check availability.' 
                  : availability.fulfilment || 'Check availability'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {!hasStoreInfo ? (
              <p className="text-sm font-medium text-gray-500">Not Checked</p>
            ) : isInStock ? (
              <p className="text-lg font-semibold text-green-600">
                {availability.this_store_qty} available
              </p>
            ) : (
              <p className="text-lg font-semibold text-red-600">Out of Stock</p>
            )}
          </div>
        </div>

        {/* Nearby Stores */}
        {availability.nearby && availability.nearby.length > 0 && (
          <div>
            <p className="text-sm font-medium text-noel-dark mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Nearby Stores
            </p>
            <div className="space-y-2">
              {availability.nearby.map((store: AvailabilityNearby, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-noel-dark">{store.store_name}</p>
                    <p className="text-xs text-gray-600">
                      {store.distance_km.toFixed(1)} km away • {store.fulfilment_option}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">{store.qty} available</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Recommendation */}
        {alternative && alternative.alt_sku && (
          <div className="mt-4 p-4 bg-noel-gold/10 border border-noel-gold/30 rounded-lg">
            <p className="font-semibold text-noel-dark mb-2">Alternative Available:</p>
            <p className="text-noel-dark mb-2">{alternative.alt_name}</p>
            {alternative.why_this_alt && (
              <p className="text-sm text-gray-700 mb-2">{alternative.why_this_alt}</p>
            )}
            {alternative.key_diff && (
              <div className="mt-2 pt-2 border-t border-noel-gold/30">
                <p className="text-xs font-medium text-gray-700 mb-1">Key difference:</p>
                <p className="text-sm text-gray-600">{alternative.key_diff}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

