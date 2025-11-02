import { motion } from 'framer-motion'

interface UserBubbleProps {
  question: string
  timestamp: Date
}

export default function UserBubble({ question, timestamp }: UserBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 mb-6 justify-end"
    >
      {/* Message Bubble */}
      <div className="max-w-3xl bg-noel-red text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
        <p className="text-base leading-relaxed">{question}</p>
        <p className="text-xs text-red-100 mt-2 opacity-75">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* User Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
        You
      </div>
    </motion.div>
  )
}

