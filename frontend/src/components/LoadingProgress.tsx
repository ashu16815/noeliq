import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingProgressProps {
  startTime: number | null
}

interface ProgressStep {
  message: string
  minTime: number // seconds
}

const PROGRESS_STEPS: ProgressStep[] = [
  { message: 'Analyzing your question...', minTime: 0 },
  { message: 'Finding relevant products...', minTime: 5 },
  { message: 'Comparing options...', minTime: 15 },
  { message: 'Generating answer...', minTime: 25 },
]

export default function LoadingProgress({ startTime }: LoadingProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!startTime) {
      setCurrentStep(0)
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setElapsedTime(elapsed)

      // Determine which step to show based on elapsed time
      let stepIndex = 0
      for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
        if (elapsed >= PROGRESS_STEPS[i].minTime) {
          stepIndex = i
          break
        }
      }
      setCurrentStep(stepIndex)
    }, 500) // Update every 500ms for smooth transitions

    return () => clearInterval(interval)
  }, [startTime])

  const currentMessage = PROGRESS_STEPS[currentStep]?.message || PROGRESS_STEPS[0].message
  const progressPercentage = Math.min(
    ((currentStep + 1) / PROGRESS_STEPS.length) * 100,
    95 // Cap at 95% to show it's still loading
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3 mb-6"
    >
      {/* NoelIQ Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-noel-red flex items-center justify-center text-white font-bold text-lg">
        N
      </div>

      {/* Loading Message Card */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 max-w-3xl">
        <div className="space-y-3">
          {/* Progress Message with Animated Dots */}
          <div className="flex items-center gap-3">
            {/* Animated Dots */}
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-2.5 h-2.5 bg-noel-red rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="w-2.5 h-2.5 bg-noel-red rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: 0.2,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="w-2.5 h-2.5 bg-noel-red rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: 0.4,
                  ease: 'easeInOut',
                }}
              />
            </div>

            {/* Progress Message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="text-gray-700 text-sm font-medium flex-1"
              >
                {currentMessage}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-noel-red to-red-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

