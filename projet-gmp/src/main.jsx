import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PageTransition from './transitions/PageTransition.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PageTransition>
        <App />
      </PageTransition>
    </BrowserRouter>
  </StrictMode>,
)
