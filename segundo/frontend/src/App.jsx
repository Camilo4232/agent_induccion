import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useStore from './store/useStore'
import Login from './pages/Login'
import Register from './pages/Register'
import OwnerDashboard from './pages/OwnerDashboard'
import EmployeeChat from './pages/EmployeeChat'
import ChangePassword from './pages/ChangePassword'
import Pricing from './pages/Pricing'
import Team from './pages/Team'
import Missions from './pages/Missions'
import MissionDetail from './pages/MissionDetail'

function PrivateRoute({ children, role }) {
  const { token, user } = useStore()
  if (!token) return <Navigate to="/login" replace />
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'owner' ? '/dashboard' : '/chat'} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute role="owner">
              <OwnerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute role="owner">
              <Team />
            </PrivateRoute>
          }
        />
        <Route
          path="/missions"
          element={
            <PrivateRoute role="owner">
              <Missions />
            </PrivateRoute>
          }
        />
        <Route
          path="/missions/:id"
          element={
            <PrivateRoute role="owner">
              <MissionDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <EmployeeChat />
            </PrivateRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <ChangePassword />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
