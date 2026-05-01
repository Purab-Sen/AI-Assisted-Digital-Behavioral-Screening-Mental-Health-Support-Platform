import api from './api'

// ─── Additional ASD Screening ─────────────────────────────────────────────
export const additionalScreeningService = {
  getInstruments: () => api.get('/additional-screening/instruments'),
  getQuestions: (instrument) => api.get(`/additional-screening/questions/${instrument}`),
  submit: (data) => api.post('/additional-screening/submit', data),
  getHistory: (instrument) => api.get('/additional-screening/history', { params: instrument ? { instrument } : {} }),
  getDetail: (id) => api.get(`/additional-screening/${id}`),
}

// ─── Comorbidity Screening ────────────────────────────────────────────────
export const comorbidityService = {
  getInstruments: () => api.get('/comorbidity/instruments'),
  getQuestions: (instrument) => api.get(`/comorbidity/questions/${instrument}`),
  submit: (data) => api.post('/comorbidity/submit', data),
  getHistory: (instrument) => api.get('/comorbidity/history', { params: instrument ? { instrument } : {} }),
  getDetail: (id) => api.get(`/comorbidity/${id}`),
}

// ─── Behavioral Observations ──────────────────────────────────────────────
export const behavioralObservationService = {
  getCategories: () => api.get('/behavioral-observations/categories'),
  create: (data) => api.post('/behavioral-observations/', data),
  createForPatient: (patientId, data) => api.post(`/behavioral-observations/patient/${patientId}`, data),
  getMyObservations: (category) => api.get('/behavioral-observations/', { params: category ? { category } : {} }),
  getSummary: () => api.get('/behavioral-observations/summary'),
  getPatientObservations: (patientId, category) => api.get(`/behavioral-observations/patient/${patientId}`, { params: category ? { category } : {} }),
  delete: (id) => api.delete(`/behavioral-observations/${id}`),
}

// ─── Referrals ────────────────────────────────────────────────────────────
export const referralService = {
  getTypes: () => api.get('/referrals/types'),
  getSuggestions: () => api.get('/referrals/suggestions'),
  create: (data) => api.post('/referrals/', data),
  createForPatient: (patientId, data) => api.post(`/referrals/patient/${patientId}`, data),
  acceptSuggestion: (suggestion) => api.post('/referrals/accept-suggestion', suggestion),
  getMyReferrals: (status) => api.get('/referrals/', { params: status ? { status } : {} }),
  getPatientReferrals: (patientId) => api.get(`/referrals/patient/${patientId}`),
  update: (id, data) => api.put(`/referrals/${id}`, data),
}

// ─── Clinical Reports ─────────────────────────────────────────────────────
export const reportService = {
  generateMyReport: () => api.get('/reports/my-report', { responseType: 'blob' }),
  generatePatientReport: (patientId) => api.get(`/reports/patient/${patientId}`, { responseType: 'blob' }),
}
