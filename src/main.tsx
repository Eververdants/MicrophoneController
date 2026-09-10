import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { invoke } from './hooks/useTauri'
import './styles/index.css'

// The main window is created hidden (see src-tauri/tauri.conf.json) so it can
// never present an unpainted surface to the user. A passive effect runs after
// the browser has committed the shell below, which is the earliest point worth
// revealing — by then the themed background and the skeleton are on screen.
//
// Deliberately not tied to requestAnimationFrame: a hidden webview may throttle
// frame callbacks, and the window has to be shown either way.
function Root() {
  useEffect(() => {
    invoke('reveal_window').catch(() => {
      // The backend watchdog reveals the window if this never lands.
    })
  }, [])

  return <App />
}

// The static shell inside #root (index.html) is replaced on this first commit.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
