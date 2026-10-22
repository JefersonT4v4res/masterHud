import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Root } from './pages/Root'
import { Jogos } from './pages/Jogos'
import { NovaMesa } from './pages/NovaMesa'
import { Gerenciador } from './pages/Gerenciador'
import { PersonagemForm, FichaPersonagem } from './pages/Personagem'
import { Combate } from './pages/Combate'
import { Login } from './pages/Login/Login'
import { Register } from './pages/Register/Register'
import { Perfil } from './pages/Perfil/Perfil'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"                                          element={<Login />} />
          <Route path="/register"                                       element={<Register />} />

          <Route path="/"                                               element={<Root />} />
          <Route path="/perfil"                                         element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/jogos"                                          element={<ProtectedRoute><Jogos /></ProtectedRoute>} />
          <Route path="/mesa/nova"                                      element={<ProtectedRoute><NovaMesa /></ProtectedRoute>} />
          <Route path="/mesa/:id"                                       element={<ProtectedRoute><Gerenciador /></ProtectedRoute>} />
          <Route path="/mesa/:id/combate"                               element={<ProtectedRoute><Combate /></ProtectedRoute>} />
          <Route path="/mesa/:id/personagem/novo"                       element={<ProtectedRoute><PersonagemForm /></ProtectedRoute>} />
          <Route path="/mesa/:id/personagem/:personagemId"              element={<ProtectedRoute><FichaPersonagem /></ProtectedRoute>} />
          <Route path="/mesa/:id/personagem/:personagemId/editar"       element={<ProtectedRoute><PersonagemForm /></ProtectedRoute>} />
          <Route path="*"                                               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
