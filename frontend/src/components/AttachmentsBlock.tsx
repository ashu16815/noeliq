import { ShoppingBag, Plus } from 'lucide-react'
import { Attachment } from '../lib/apiClient'

interface AttachmentsBlockProps {
  attachments: Attachment[]
}

export default function AttachmentsBlock({ attachments }: AttachmentsBlockProps) {
  return (
    <div className="border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-5 h-5 text-noel-red" />
        <h3 className="text-lg font-medium text-noel-dark">Most People Also Pick Up</h3>
      </div>

      <div className="space-y-3">
        {attachments.map((attachment, idx) => (
          <div
            key={idx}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="bg-noel-gold/20 rounded-full p-2">
                <Plus className="w-4 h-4 text-noel-gold" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-noel-dark mb-1">{attachment.name}</p>
                <p className="text-sm text-gray-700">{attachment.why_sell}</p>
                <p className="text-xs text-gray-500 mt-2">SKU: {attachment.sku}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

