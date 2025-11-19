// src/main.jsx
// ----------------------------------------------------------
// ARCHIVO CORREGIDO (Paso 2.3)
// ----------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- 1. Importamos el Provider ---
import { EduChainProvider } from './context/EduChainContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* --- 2. Envolvemos la App --- */}
    <EduChainProvider>
      <App />
    </EduChainProvider>
  </StrictMode>,
)