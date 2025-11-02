// Service to check stock availability
// In MVP, this integrates with store data to provide realistic availability

import dbClient from '../lib/dbClient.js'

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper: Get store by ID/code
function findStore(stores, storeId) {
  return stores.find(s => {
    const id = s['@_storeCode'] || s.id || s.code || ''
    return String(id).toLowerCase() === String(storeId).toLowerCase() ||
           String(s.name || s.storeName || '').toLowerCase().includes(String(storeId).toLowerCase())
  })
}

const availabilityService = {
  async getAvailability(sku, store_id) {
    console.log(`Checking availability for SKU: ${sku}, Store: ${store_id}`)

    try {
      // Get all stores
      const stores = await dbClient.getStores()
      
      if (!store_id || stores.length === 0) {
        // No store selected or no stores loaded
        return {
          sku,
          store_id: null,
          this_store_qty: null,
          nearby: [],
          fulfilment: 'Select a store to check availability',
          last_checked_ts: new Date().toISOString(),
        }
      }

      // Find the selected store
      const selectedStore = findStore(stores, store_id)
      
      if (!selectedStore) {
        console.warn(`Store ${store_id} not found in store data`)
        return {
          sku,
          store_id,
          this_store_qty: null,
          nearby: [],
          fulfilment: `Store ${store_id} not found`,
          last_checked_ts: new Date().toISOString(),
        }
      }

      const selectedStoreName = selectedStore.name || selectedStore.storeName || 'Unknown'
      const selectedCoords = selectedStore.coordinates || {}
      const selectedLat = selectedCoords.latitude
      const selectedLon = selectedCoords.longitude

      // Mock stock for this store (TODO: Replace with real inventory API)
      const thisStoreQty = Math.floor(Math.random() * 10) // 0-9 units

      // Find nearby stores (within 50km radius, sorted by distance)
      const nearbyStores = []
      
      if (selectedLat && selectedLon) {
        for (const store of stores) {
          // Skip the selected store itself
          const storeCode = store['@_storeCode'] || store.id || store.code || ''
          if (String(storeCode).toLowerCase() === String(store_id).toLowerCase()) {
            continue
          }

          const storeCoords = store.coordinates || {}
          const storeLat = storeCoords.latitude
          const storeLon = store.coordinates?.longitude

          if (storeLat && storeLon) {
            const distance = calculateDistance(selectedLat, selectedLon, storeLat, storeLon)
            
            // Only include stores within 50km
            if (distance <= 50) {
              nearbyStores.push({
                store_id: storeCode,
                store_name: store.name || store.storeName || 'Unknown Store',
                distance_km: Math.round(distance * 10) / 10, // Round to 1 decimal
                coordinates: { latitude: storeLat, longitude: storeLon },
              })
            }
          }
        }

        // Sort by distance and take top 3
        nearbyStores.sort((a, b) => a.distance_km - b.distance_km)
        const topNearby = nearbyStores.slice(0, 3)
        
        // Add mock stock data (TODO: Replace with real inventory API)
        const nearbyWithStock = topNearby.map(store => ({
          ...store,
          qty: Math.floor(Math.random() * 8) + 1, // 1-8 units
          // Remove mock fulfilment times - these should come from real system
          fulfilment_option: null, // Will be set by real inventory system
        }))

        return {
          sku,
          store_id,
          this_store_qty: thisStoreQty,
          nearby: nearbyWithStock,
          fulfilment: thisStoreQty > 0
            ? `Available in store (${thisStoreQty} units)`
            : 'Out of stock - check nearby stores',
          last_checked_ts: new Date().toISOString(),
        }
      } else {
        // Store doesn't have coordinates - can't calculate nearby
        return {
          sku,
          store_id,
          this_store_qty: thisStoreQty,
          nearby: [],
          fulfilment: thisStoreQty > 0
            ? `Available in store (${thisStoreQty} units)`
            : 'Out of stock',
          last_checked_ts: new Date().toISOString(),
        }
      }
    } catch (error) {
      console.error('Error getting availability:', error)
      // Fallback to basic response
      return {
        sku,
        store_id,
        this_store_qty: null,
        nearby: [],
        fulfilment: 'Error checking availability',
        last_checked_ts: new Date().toISOString(),
      }
    }
  },
}

export default availabilityService

