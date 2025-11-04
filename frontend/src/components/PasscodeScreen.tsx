import { useState } from 'react'
import { motion } from 'framer-motion'

interface PasscodeScreenProps {
  onSuccess: () => void
}

const PasscodeScreen = ({ onSuccess }: PasscodeScreenProps) => {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Get passcode from environment variable or use default
  const requiredPasscode = import.meta.env.VITE_PLATFORM_PASSCODE || 'noeliq2024'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simple passcode check
    if (passcode === requiredPasscode) {
      // Store authentication in localStorage
      localStorage.setItem('noeliq_authenticated', 'true')
      localStorage.setItem('noeliq_auth_timestamp', Date.now().toString())
      onSuccess()
    } else {
      setError('Incorrect passcode. Please try again.')
      setPasscode('')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NoelIQ</h1>
          <p className="text-gray-600">Enter passcode to access the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-2">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value)
                setError('')
              }}
              placeholder="Enter passcode"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !passcode}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Verifying...' : 'Enter Platform'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Noel Leeming Sales Assistant Platform</p>
        </div>
      </motion.div>
    </div>
  )
}

export default PasscodeScreen

