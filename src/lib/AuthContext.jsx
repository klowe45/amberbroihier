import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Hydrate on mount: /api/auth/me returns { user } or { user: null }.
  // Never throws for "logged out", just for network errors.
  useEffect(() => {
    let mounted = true
    api
      .get('/api/auth/me')
      .then((data) => {
        if (!mounted) return
        setUser(data?.user ?? null)
      })
      .catch(() => {
        if (mounted) setUser(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const signIn = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password })
    setUser(data.user)
    return { error: null }
  }

  const signOut = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: !!user?.isAdmin,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
