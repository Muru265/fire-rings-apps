import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Stars from './components/Stars'
import { Header } from './components/Shell'
import { EMBED } from './lib/api'
import Expect from './pages/Expect'
import FactCheck from './pages/FactCheck'
import Home from './pages/Home'
import Insurance from './pages/Insurance'
import Land from './pages/Land'
import Smoke from './pages/Smoke'
import Volcano from './pages/Volcano'

if (EMBED) document.documentElement.classList.add('embed')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Stars density={EMBED ? 0.5 : 1} />
      <Header />
      <Routes>
        <Route index element={<Home />} />
        <Route path="expect" element={<Expect />} />
        <Route path="factcheck" element={<FactCheck />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="smoke" element={<Smoke />} />
        <Route path="volcano" element={<Volcano />} />
        <Route path="land" element={<Land />} />
        <Route path="*" element={<main className="wrap" style={{ paddingTop: 40 }}><h1>Not found</h1><p className="muted"><a href="/">All apps →</a></p></main>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
