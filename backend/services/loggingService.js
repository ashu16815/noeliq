import dbClient from '../lib/dbClient.js'

const loggingService = {
  async logQuestion({ store_id, staff_id, sku, question, conversation_id }) {
    try {
      await dbClient.storeLog({
        timestamp: new Date(),
        store_id: store_id || null,
        staff_id: staff_id || null,
        sku: sku || null,
        question,
        answer_len: null,
        oos_alternative_shown: false,
        attachments_suggested: false,
      })
    } catch (error) {
      console.error('Error logging question:', error)
      // Don't throw - logging failures shouldn't break the flow
    }
  },

  async logAnswer({ store_id, staff_id, sku, question, answer_length, oos_alternative_shown, attachments_suggested }) {
    try {
      // Update the most recent log entry for this question, or create new
      await dbClient.storeLog({
        timestamp: new Date(),
        store_id: store_id || null,
        staff_id: staff_id || null,
        sku: sku || null,
        question,
        answer_len: answer_length || 0,
        oos_alternative_shown: oos_alternative_shown || false,
        attachments_suggested: attachments_suggested || false,
      })
    } catch (error) {
      console.error('Error logging answer:', error)
      // Don't throw - logging failures shouldn't break the flow
    }
  },

  async logPipelineActivity({ sku, action, status, error_message }) {
    try {
      // Log to database or file system
      console.log(`[Pipeline] ${action} for SKU ${sku}: ${status}${error_message ? ` - ${error_message}` : ''}`)
      // TODO: Store in database if needed
    } catch (error) {
      console.error('Error logging pipeline activity:', error)
    }
  },
}

export default loggingService

