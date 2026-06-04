import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AUTH_KEY } from './lib/constants'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DropPage from './pages/DropPage'
import ItemPage from './pages/ItemPage'

function PrivateRoute({ children }) {
  const auth = sessionStorage.getItem(AUTH_KEY)
  const location = useLocation()
  if (!auth) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function LoginRoute() {
  const auth = sessionStorage.getItem(AUTH_KEY)
  const location = useLocation()
  if (auth) return <Navigate to={location.state?.from?.pathname || '/'} replace />
  return <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/drops/:dropId" element={<PrivateRoute><DropPage /></PrivateRoute>} />
        <Route path="/drops/:dropId/items/:itemId" element={<PrivateRoute><ItemPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
