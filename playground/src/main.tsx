import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RuntimeLoader } from '@rive-app/canvas'
import riveWasmUrl from '@rive-app/canvas/rive.wasm?url'
import './index.css'
import App from './App.tsx'

RuntimeLoader.setWasmUrl(riveWasmUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
