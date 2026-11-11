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
import { Compendio } from './pages/Compendio'
import { EntrarMesa } from './pages/EntrarMesa'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"                                          element={<Login />} />
          <Route path="/register"                                       element={<Register />} />

          <Route path="/"                                               element={<Root />} />
          <Route path="/perfil"                                         element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/compendio"                                      element={<ProtectedRoute><Compendio /></ProtectedRoute>} />
          <Route path="/jogos"                                          element={<ProtectedRoute><Jogos /></ProtectedRoute>} />
          <Route path="/mesa/nova"                                      element={<ProtectedRoute><NovaMesa /></ProtectedRoute>} />
          <Route path="/mesa/entrar"                                    element={<ProtectedRoute><EntrarMesa /></ProtectedRoute>} />
          <Route path="/mesa/:donoUid/:id"                                       element={<ProtectedRoute><Gerenciador /></ProtectedRoute>} />
          <Route path="/mesa/:donoUid/:id/combate"                               element={<ProtectedRoute><Combate /></ProtectedRoute>} />
          <Route path="/mesa/:donoUid/:id/personagem/novo"                       element={<ProtectedRoute><PersonagemForm /></ProtectedRoute>} />
          <Route path="/mesa/:donoUid/:id/personagem/:personagemId"              element={<ProtectedRoute><FichaPersonagem /></ProtectedRoute>} />
          <Route path="/mesa/:donoUid/:id/personagem/:personagemId/editar"       element={<ProtectedRoute><PersonagemForm /></ProtectedRoute>} />
          <Route path="*"                                               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
