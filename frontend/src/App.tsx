import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ChatScreen from './pages/ChatScreen'
import AdminDashboardView from './pages/AdminDashboardView'
import PasscodeScreen from './components/PasscodeScreen'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const authStatus = localStorage.getItem('noeliq_authenticated')
      const authTimestamp = localStorage.getItem('noeliq_auth_timestamp')
      
      if (authStatus === 'true' && authTimestamp) {
        // Check if authentication is still valid (24 hours)
        const timestamp = parseInt(authTimestamp, 10)
        const now = Date.now()
        const hoursSinceAuth = (now - timestamp) / (1000 * 60 * 60)
        
        if (hoursSinceAuth < 24) {
          setIsAuthenticated(true)
          return
        } else {
          // Expired - clear auth
          localStorage.removeItem('noeliq_authenticated')
          localStorage.removeItem('noeliq_auth_timestamp')
        }
      }
      
      setIsAuthenticated(false)
    }

    checkAuth()
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show passcode screen if not authenticated
  if (!isAuthenticated) {
    return <PasscodeScreen onSuccess={handleAuthSuccess} />
  }

  // Show app if authenticated
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/sales" element={<ChatScreen />} /> {/* Legacy route */}
          <Route path="/admin" element={<AdminDashboardView />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App

