import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  demoLogin: (role) => api.post('/auth/demo', { role }),
  changePassword: (current_password, new_password) =>
    api.post('/auth/change-password', { current_password, new_password }),
}

export const teachAPI = {
  teach: (text) => api.post('/teach', { text }),
  listKnowledge: () => api.get('/knowledge'),
  updateEntry: (id, data) => api.patch(`/knowledge/${id}`, data),
  deleteEntry: (id) => api.delete(`/knowledge/${id}`),
}

export const askAPI = {
  ask: (question, session_id) => api.post('/ask', { question, session_id }),
  getHistory: (sessionId) => api.get(`/sessions/${sessionId}/history`),
}

export const unansweredAPI = {
  list: () => api.get('/unanswered'),
  resolve: (id, answer) => api.post(`/unanswered/${id}/resolve`, { answer }),
}

export const inviteAPI = {
  invite: (phone, name, custom_password) => api.post('/invite', { phone, name, custom_password: custom_password || undefined }),
}

export const teamAPI = {
  list: () => api.get('/team'),
  remove: (userId) => api.delete(`/team/${userId}`),
}

export const proposalsAPI = {
  list: () => api.get('/proposals'),
  approve: (id) => api.post(`/proposals/${id}/approve`),
  reject: (id) => api.post(`/proposals/${id}/reject`),
  listConflicts: () => api.get('/knowledge/conflicts'),
  resolveConflict: (id) => api.post(`/knowledge/conflicts/${id}/resolve`),
}

export const briefingAPI = {
  generate: () => api.post('/briefing/generate'),
}

export const transcribeAPI = {
  transcribe: (audioBlob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.webm')
    return api.post('/transcribe', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export default api
