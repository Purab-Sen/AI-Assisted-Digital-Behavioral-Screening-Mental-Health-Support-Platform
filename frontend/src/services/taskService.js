/**
 * Task Service
 * 
 * API service for behavioral tasks, session management, and progress tracking.
 */
import api from './api';

const taskService = {
  // =============================================================================
  // Task Listing
  // =============================================================================
  
  /**
   * Get all available tasks
   * @param {string} taskType - Optional filter by task type
   */
  getAllTasks: async (taskType = null) => {
    const params = taskType ? { task_type: taskType } : {};
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  /**
   * Get detailed information about a specific task
   * @param {number} taskId 
   */
  getTaskDetail: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // =============================================================================
  // Task Sessions
  // =============================================================================

  /**
   * Start a new task session
   * @param {number} taskId 
   */
  startSession: async (taskId) => {
    const response = await api.post('/tasks/sessions/start', { task_id: taskId });
    return response.data;
  },

  /**
   * Submit results and complete a task session
   * @param {number} sessionId 
   * @param {Array} results - Array of {metric_name, metric_value}
   * @param {object} metadata - Optional additional data
   */
  submitSession: async (sessionId, results, metadata = null) => {
    const payload = { results };
    if (metadata) {
      payload.metadata = metadata;
    }
    const response = await api.post(`/tasks/sessions/${sessionId}/submit`, payload);
    return response.data;
  },

  /**
   * Get details of a completed task session
   * @param {number} sessionId 
   */
  getSession: async (sessionId) => {
    const response = await api.get(`/tasks/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Delete an incomplete task session
   * @param {number} sessionId 
   */
  deleteIncompleteSession: async (sessionId) => {
    await api.delete(`/tasks/sessions/${sessionId}`);
  },

  // =============================================================================
  // History & Progress
  // =============================================================================

  /**
   * Get user's task session history
   * @param {number} limit - Max number of sessions to return
   */
  getHistory: async (limit = 20) => {
    const response = await api.get('/tasks/history/sessions', { params: { limit } });
    return response.data;
  },

  /**
   * Get user's progress for a specific task
   * @param {number} taskId 
   */
  getTaskProgress: async (taskId) => {
    const response = await api.get(`/tasks/progress/${taskId}`);
    return response.data;
  },

  /**
   * Get overall task statistics for the current user
   */
  getMyStats: async () => {
    const response = await api.get('/tasks/stats/me');
    return response.data;
  }
};

export default taskService;
