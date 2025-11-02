import { RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface SyncStatus {
  sku: string
  last_seen_hash?: string
  last_embedded_hash?: string
  needs_reembed?: boolean
  last_successful_embed_ts?: string
  status: 'synced' | 'stale' | 'error'
  error_message?: string | null
}

interface SyncTableProps {
  statuses: SyncStatus[]
  onReindex?: () => void
}

export default function SyncTable({ statuses, onReindex }: SyncTableProps) {
  const handleReindex = async (sku: string) => {
    try {
      await api.reindex([sku])
      if (onReindex) {
        setTimeout(onReindex, 1000)
      }
    } catch (error) {
      console.error('Error reindexing:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      synced: 'bg-green-100 text-green-800 border-green-200',
      stale: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
    }

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}
      >
        {status}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'stale':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  if (statuses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No sync status data available. Upload an XML file to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Embedded
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Needs Re-embed
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Error
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {statuses.map((status, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  {getStatusBadge(status.status)}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-noel-dark">
                {status.sku}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {status.last_successful_embed_ts
                  ? new Date(status.last_successful_embed_ts).toLocaleString()
                  : 'Never'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {status.needs_reembed ? (
                  <span className="text-yellow-600 font-medium">Yes</span>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {status.error_message ? (
                  <span className="text-red-600 text-xs">{status.error_message}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {status.status !== 'synced' && (
                  <button
                    onClick={() => handleReindex(status.sku)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-noel-red text-white rounded hover:bg-red-700 transition-colors"
                    title="Reindex this SKU"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reindex
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

