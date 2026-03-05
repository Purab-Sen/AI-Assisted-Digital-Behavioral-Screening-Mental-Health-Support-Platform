import api from './api'

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, refresh_token } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    return response.data
  },

  async logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  async updateProfile(userData) {
    const response = await api.put('/auth/me', userData)
    return response.data
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response.data
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token')
  }
}
