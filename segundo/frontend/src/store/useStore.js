import { create } from 'zustand'

const useStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null })
  },
}))

export default useStore
