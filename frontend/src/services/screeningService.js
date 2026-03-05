/**
 * Screening Service
 * 
 * API calls for AQ-10 screening questionnaire.
 */
import api from './api'

export const screeningService = {
  /**
   * Get all AQ-10 questions
   */
  getQuestions: async () => {
    const response = await api.get('/screening/questions')
    return response.data
  },

  /**
   * Get risk level information
   */
  getRiskLevels: async () => {
    const response = await api.get('/screening/risk-levels')
    return response.data
  },

  /**
   * Start a new screening session
   */
  startScreening: async () => {
    const response = await api.post('/screening/start')
    return response.data
  },

  /**
   * Submit a single answer (for incremental saving)
   */
  submitAnswer: async (sessionId, answer) => {
    const response = await api.post(`/screening/sessions/${sessionId}/answer`, answer)
    return response.data
  },

  /**
   * Submit all answers and complete screening
   */
  submitScreening: async (sessionId, answers) => {
    const response = await api.post(`/screening/sessions/${sessionId}/submit`, {
      answers
    })
    return response.data
  },

  /**
   * Complete a screening that has all answers submitted
   */
  completeScreening: async (sessionId) => {
    const response = await api.post(`/screening/sessions/${sessionId}/complete`)
    return response.data
  },

  /**
   * Get screening history
   */
  getHistory: async (limit = 10) => {
    const response = await api.get(`/screening/history?limit=${limit}`)
    return response.data
  },

  /**
   * Get a specific screening result
   */
  getResult: async (sessionId) => {
    const response = await api.get(`/screening/sessions/${sessionId}`)
    return response.data
  },

  /**
   * Get the latest completed screening
   */
  getLatest: async () => {
    const response = await api.get('/screening/latest')
    return response.data
  },

  /**
   * Delete an incomplete screening session
   */
  deleteIncomplete: async (sessionId) => {
    const response = await api.delete(`/screening/sessions/${sessionId}`)
    return response.data
  }
}

export default screeningService
