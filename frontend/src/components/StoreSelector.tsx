import { useState, useEffect } from 'react'
import { MapPin, Check } from 'lucide-react'
import { api } from '../lib/apiClient'

interface Store {
  id?: string
  code?: string
  name?: string
  storeName?: string
  address?: string
  city?: string
  '@_storeCode'?: string  // XML attribute
  region?: string
  [key: string]: any
}

export default function StoreSelector() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Load selected store from localStorage
    const savedStoreId = localStorage.getItem('store_id')
    if (savedStoreId) {
      setSelectedStoreId(savedStoreId)
    }

    // Fetch stores
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setIsLoading(true)
      const storesData = await api.getStores()
      setStores(Array.isArray(storesData) ? storesData : [])
    } catch (error) {
      console.error('Error loading stores:', error)
      // If API fails, use fallback stores
      setStores([
        { id: 'store_001', name: 'Noel Leeming Auckland Central', city: 'Auckland' },
        { id: 'store_002', name: 'Noel Leeming Newmarket', city: 'Auckland' },
        { id: 'store_003', name: 'Noel Leeming Wellington', city: 'Wellington' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectStore = (storeId: string) => {
    setSelectedStoreId(storeId)
    localStorage.setItem('store_id', storeId)
    setIsOpen(false)
    
    // Show success message briefly
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    notification.textContent = 'Store selected!'
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  const getStoreId = (store: Store) => {
    // Try various possible ID fields (stores from XML use @_storeCode)
    return store['@_storeCode'] ||
           store.id || 
           store.code || 
           store.storeId || 
           store['@_id'] || 
           String(store.name || store.storeName || store['@_name'] || 'Unknown')
  }
  
  const getStoreDisplayName = (store: Store) => {
    return store.name || 
           store.storeName || 
           store['@_name'] || 
           store.id || 
           store.code || 
           'Unknown Store'
  }

  const selectedStore = stores.find(s => getStoreId(s) === selectedStoreId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white text-noel-dark rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        title="Select Store"
      >
        <MapPin className="w-4 h-4 text-noel-red" />
        <span className="text-sm font-medium">
          {selectedStore ? getStoreDisplayName(selectedStore) : 'Select Store'}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 max-h-96 overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-noel-dark">Select Store</h3>
              <p className="text-xs text-gray-600 mt-1">Choose your store to check availability</p>
            </div>
            
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading stores...</div>
            ) : stores.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No stores available</p>
                <p className="text-xs mt-2">Upload XML catalogue to load stores</p>
              </div>
            ) : (
              <div className="py-2">
                {stores.map((store) => {
                  const storeId = getStoreId(store)
                  const isSelected = selectedStoreId === storeId
                  
                  return (
                    <button
                      key={storeId}
                      onClick={() => handleSelectStore(storeId)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-noel-red/5' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-noel-dark">{getStoreDisplayName(store)}</p>
                        {(store.region || store.city || store.address) && (
                          <p className="text-xs text-gray-600 mt-1">
                            {store.region || store.city || store.address}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-noel-red" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

