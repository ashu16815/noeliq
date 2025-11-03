import { useState, useEffect, useRef } from 'react'
import { Search, Send, X } from 'lucide-react'
import { api, ProductSearchResult } from '../lib/apiClient'

interface AskPanelProps {
  onAsk: (sku: string, question: string) => void
  isLoading?: boolean
}

export default function AskPanel({ onAsk, isLoading = false }: AskPanelProps) {
  const [sku, setSku] = useState('')
  const [question, setQuestion] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced product search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // Don't search if user selected a product
    if (selectedProduct && searchQuery === selectedProduct.name) {
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await api.searchProducts(searchQuery, 5)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        console.error('Error searching products:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, selectedProduct])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product)
    setSku(product.sku)
    setSearchQuery(product.name)
    setShowResults(false)
  }

  const handleClearProduct = () => {
    setSelectedProduct(null)
    setSku('')
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim()) {
      onAsk(sku.trim(), question.trim())
      setQuestion('')
      // Keep SKU and selected product for follow-up questions
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-noel-dark mb-2">
            SKU / Product Name (optional)
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="sku"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!e.target.value.trim()) {
                  handleClearProduct()
                }
              }}
              placeholder="Type product name (e.g., 'garmin watch') or SKU"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-noel-red focus:border-transparent text-noel-dark"
              disabled={isLoading}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true)
                }
              }}
            />
            {selectedProduct && (
              <button
                type="button"
                onClick={handleClearProduct}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear selection"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showResults && (searchResults.length > 0 || isSearching) && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="w-5 h-5 border-2 border-noel-red border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No products found
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((product) => (
                      <button
                        key={product.sku}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-noel-dark">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600">SKU: {product.sku}</span>
                              {product.category && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-xs text-gray-600">{product.category}</span>
                                </>
                              )}
                            </div>
                            {product.preview && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {product.preview}
                              </p>
                            )}
                            {product.price && (
                              <p className="text-xs font-semibold text-noel-red mt-1">
                                ${product.price}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedProduct && (
            <p className="mt-2 text-xs text-gray-600">
              Selected: <span className="font-medium">{selectedProduct.name}</span> (SKU: {selectedProduct.sku})
            </p>
          )}
        </div>

        <div>
          <label htmlFor="question" className="block text-sm font-medium text-noel-dark mb-2">
            Your Question
          </label>
          <div className="relative">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this product... (e.g., 'Is this good for PS5 gaming?')"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-noel-red focus:border-transparent text-noel-dark resize-none"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="w-full bg-noel-red text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-noel-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Asking...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Ask NoelIQ
            </>
          )}
        </button>
      </form>
    </div>
  )
}
