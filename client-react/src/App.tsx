import { Toaster } from 'react-hot-toast'
import { Dashboard } from './components/Dashboard'

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster position="bottom-right" />
    </>
  )
}
