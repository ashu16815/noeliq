import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import XMLUpload from '../components/Admin/XMLUpload'
import SyncTable from '../components/Admin/SyncTable'
import { api } from '../lib/apiClient'

export default function AdminDashboardView() {
  const [syncStatus, setSyncStatus] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadSyncStatus = async () => {
    try {
      setIsLoading(true)
      const data = await api.getSyncStatus()
      setSyncStatus(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading sync status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const data = await api.getLogs()
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  useEffect(() => {
    loadSyncStatus()
    loadLogs()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadSyncStatus()
      loadLogs()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleXMLUpload = async () => {
    await loadSyncStatus()
    await loadLogs()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'stale':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const overallStatus = syncStatus.length > 0
    ? syncStatus.every((s) => s.status === 'synced')
      ? 'synced'
      : syncStatus.some((s) => s.status === 'error')
      ? 'error'
      : 'stale'
    : 'unknown'

  return (
    <div className="min-h-screen bg-noel-dark">
      {/* Header */}
      <header className="bg-noel-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">NoelIQ Admin Dashboard</h1>
              <p className="text-sm text-red-100">Catalogue sync and monitoring</p>
            </div>
            <button
              onClick={() => window.location.href = '/sales'}
              className="px-4 py-2 bg-white text-noel-red rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Sales View
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Overall Status */}
        <div className="bg-white rounded-card shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-noel-dark">Overall Status</h2>
            <button
              onClick={loadSyncStatus}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-noel-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-4">
            {getStatusIcon(overallStatus)}
            <div>
              <p className="font-medium text-noel-dark">
                {overallStatus === 'synced' && 'All systems synced'}
                {overallStatus === 'stale' && 'Some updates pending'}
                {overallStatus === 'error' && 'Errors detected'}
                {overallStatus === 'unknown' && 'No data loaded'}
              </p>
              <p className="text-sm text-gray-600">
                {syncStatus.length} SKU(s) tracked
              </p>
            </div>
          </div>
        </div>

        {/* XML Upload */}
        <div className="mb-6">
          <XMLUpload onUploadComplete={handleXMLUpload} />
        </div>

        {/* Sync Status Table */}
        <div className="bg-white rounded-card shadow-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-noel-dark mb-4">Sync Status</h2>
          <SyncTable statuses={syncStatus} onReindex={loadSyncStatus} />
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="text-xl font-semibold text-noel-dark mb-4">Recent Activity</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No logs available</p>
            ) : (
              logs.slice(0, 50).map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="text-gray-500 w-32">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="font-medium text-noel-dark w-24">{log.sku || 'N/A'}</span>
                  <span className="text-gray-600 w-32">{log.action}</span>
                  <span
                    className={`font-medium ${
                      log.status === 'success'
                        ? 'text-green-600'
                        : log.status === 'error'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {log.status}
                  </span>
                  {log.error_message && (
                    <span className="text-red-600 text-xs flex-1 truncate">
                      {log.error_message}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

