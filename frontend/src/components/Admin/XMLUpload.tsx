import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface XMLUploadProps {
  onUploadComplete?: () => void
}

export default function XMLUpload({ onUploadComplete }: XMLUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.includes('xml')) {
      setFile(selectedFile)
      setError(null)
      if (!sourceLabel) {
        setSourceLabel(selectedFile.name.replace('.xml', ''))
      }
    } else {
      setError('Please select a valid XML file')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await api.uploadXML(file, sourceLabel || file.name)
      setUploadResult(result)
      setFile(null)
      setSourceLabel('')
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-xl font-semibold text-noel-dark mb-4">Upload XML Catalogue</h2>

      <div className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-noel-dark mb-2">
            XML File
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-noel-red transition-colors">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-noel-dark">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                      }}
                      className="ml-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="w-8 h-8" />
                    <span>Click to select XML file</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Source Label */}
        <div>
          <label className="block text-sm font-medium text-noel-dark mb-2">
            Source Label (optional)
          </label>
          <input
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="e.g., nightly_feed_2025-11-02"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-noel-red focus:border-transparent text-noel-dark"
            disabled={isUploading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">Upload successful!</p>
            <div className="text-sm text-green-700 space-y-1">
              <p>Parsed SKUs: {uploadResult.parsed_skus || 'N/A'}</p>
              <p>Changed SKUs: {uploadResult.changed_skus || 'N/A'}</p>
              <p>Status: {uploadResult.status}</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-noel-red text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload & Process XML
            </>
          )}
        </button>
      </div>
    </div>
  )
}

