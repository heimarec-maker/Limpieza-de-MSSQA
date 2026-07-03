import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import LimpiezaEquipos from './pages/LimpiezaEquipos'
import CreacionEquipos from './pages/CreacionEquipos'
import LimpiezaSmw from './pages/LimpiezaSmw'
import LimpiezaMss from './pages/LimpiezaMss'
import Login from './pages/Login'
import Perfil from './pages/Perfil'
import AdminPanel from './pages/AdminPanel'
import AdminUsuarios from './pages/AdminUsuarios'
import AdminLimpiezas from './pages/AdminLimpiezas'
import ManualUsuario from './pages/ManualUsuario'
import ManualTecnico from './pages/ManualTecnico'
import PoliticasSeguridad from './pages/PoliticasSeguridad'
import SoporteTecnico from './pages/SoporteTecnico'
import { useEffect } from 'react'
import ProtectedRoute from './components/ProtectedRoute'

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <div className="app-wrapper">
      <ScrollToTop />
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      {!isLoginPage && <Navbar />}
          <main className={!isLoginPage ? "main-content" : ""}>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas: requieren sesión */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/limpieza-equipos" element={<ProtectedRoute><LimpiezaEquipos /></ProtectedRoute>} />
          <Route path="/creacion-equipos" element={<ProtectedRoute><CreacionEquipos /></ProtectedRoute>} />
          <Route path="/limpieza-smw" element={<ProtectedRoute><LimpiezaSmw /></ProtectedRoute>} />
          <Route path="/limpieza-mss" element={<ProtectedRoute><LimpiezaMss /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/manual" element={<ProtectedRoute><ManualUsuario /></ProtectedRoute>} />
          <Route path="/manual-tecnico" element={<ProtectedRoute><ManualTecnico /></ProtectedRoute>} />
          <Route path="/seguridad" element={<ProtectedRoute><PoliticasSeguridad /></ProtectedRoute>} />
          <Route path="/soporte" element={<ProtectedRoute><SoporteTecnico /></ProtectedRoute>} />

          {/* Rutas de Administrador */}
          <Route path="/admin/actividad" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute requiredRole="admin"><AdminUsuarios /></ProtectedRoute>} />
          <Route path="/admin/limpiezas" element={<ProtectedRoute requiredRole="admin"><AdminLimpiezas /></ProtectedRoute>} />
        </Routes>
      </main>
      {!isLoginPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App
