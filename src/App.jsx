import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import { EditProvider } from './lib/EditContext.jsx'
import { ConfirmProvider } from './lib/ConfirmContext.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Speaking from './pages/Speaking.jsx'
import Prices from './pages/Prices.jsx'
import Retreats from './pages/Retreats.jsx'
import Waivers from './pages/Waivers.jsx'
import Book from './pages/Book.jsx'
import Inquiry from './pages/Inquiry.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import NotFound from './pages/NotFound.jsx'

// Split out of the visitor bundle: the admin area carries the blog editor
// (and with it Quill), and the login page is only ever hit by Amber.
const Login = lazy(() => import('./pages/Login.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

function App() {
  return (
    <AuthProvider>
      <EditProvider>
      <ConfirmProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/speaking" element={<Speaking />} />
          <Route path="/prices" element={<Prices />} />
          <Route path="/retreats" element={<Retreats />} />
          <Route path="/waivers" element={<Waivers />} />
          <Route path="/book" element={<Book />} />
          <Route path="/inquiry" element={<Inquiry />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </ConfirmProvider>
      </EditProvider>
    </AuthProvider>
  )
}

export default App
