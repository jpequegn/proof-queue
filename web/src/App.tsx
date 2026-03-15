import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueuePage } from './pages/QueuePage'
import { ThreadPage } from './pages/ThreadPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QueuePage />} />
        <Route path="/threads/:id" element={<ThreadPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
