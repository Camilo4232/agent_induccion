import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            BASE_URL + '/auth/refresh',
            { refresh_token: refreshToken }
          )
          localStorage.setItem('token', data.access_token)
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(err.config)
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
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
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
  },
}

export const teachAPI = {
  teach: (text) => api.post('/teach', { text }),
  listKnowledge: (params = {}) => api.get('/knowledge', { params }),
  updateEntry: (id, data) => api.patch(`/knowledge/${id}`, data),
  deleteEntry: (id) => api.delete(`/knowledge/${id}`),
  bulkUpload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/knowledge/bulk-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  bulkPreview: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/knowledge/bulk-preview', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  bulkConfirm: (facts) => api.post('/knowledge/bulk-confirm', { facts }),
  bulkText: (text) => api.post('/knowledge/bulk-text', { text }),
}

export const templatesAPI = {
  list: () => api.get('/knowledge/templates'),
  load: (id) => api.post(`/knowledge/templates/${id}/load`),
}

export const askAPI = {
  ask: (question, session_id) => api.post('/ask', { question, session_id }),
  getHistory: (sessionId) => api.get(`/sessions/${sessionId}/history`),
  listSessions: () => api.get('/sessions'),
}

export const unansweredAPI = {
  list: () => api.get('/unanswered'),
  history: () => api.get('/unanswered/history'),
  resolve: (id, answer) => api.post(`/unanswered/${id}/resolve`, { answer }),
  dismiss: (id) => api.delete(`/unanswered/${id}`),
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
  resolveConflict: (id, keepFactId) => api.post(`/knowledge/conflicts/${id}/resolve`, keepFactId ? { keep_fact_id: keepFactId } : {}),
}

export const briefingAPI = {
  generate: () => api.post('/briefing/generate'),
}

export const notificationsAPI = {
  list: (unread) => api.get('/notifications', { params: unread ? { unread: true } : {} }),
  count: () => api.get('/notifications/count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
}

export const transcribeAPI = {
  transcribe: (audioBlob, filename = 'recording.webm') => {
    const form = new FormData()
    form.append('audio', audioBlob, filename)
    return api.post('/transcribe', form)
  },
}

export const analyticsAPI = {
  summary: () => api.get('/analytics/summary'),
  knowledgeUsage: () => api.get('/analytics/knowledge-usage'),
}

export const billingAPI = {
  listPlans: () => api.get('/billing/plans'),
  myPlan: () => api.get('/billing/plan'),
  subscribe: (plan) => api.post('/billing/subscribe', { plan }),
}

export const agentsAPI = {
  list: (includeArchived) => api.get('/agents', { params: includeArchived ? { include_archived: true } : {} }),
  templates: (industry) => api.get('/agents/templates', { params: industry ? { industry } : {} }),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.patch(`/agents/${id}`, data),
  archive: (id) => api.delete(`/agents/${id}`),
  seed: () => api.post('/agents/seed'),
  chat: (id, message, history) => api.post(`/agents/${id}/chat`, { message, history: history || undefined }),
}

export const missionsAPI = {
  create: (objective, title) => api.post('/missions', { objective, title: title || undefined }),
  list: () => api.get('/missions'),
  get: (id) => api.get(`/missions/${id}`),
  cancel: (id) => api.post(`/missions/${id}/cancel`),
}

export default api
