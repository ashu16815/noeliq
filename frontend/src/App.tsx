import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ChatScreen from './pages/ChatScreen'
import AdminDashboardView from './pages/AdminDashboardView'

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/sales" element={<ChatScreen />} /> {/* Legacy route */}
        <Route path="/admin" element={<AdminDashboardView />} />
      </Routes>
    </Router>
  )
}

export default App

