import { useState } from "react"
import HomePage from "./pages/HomePage"
import Dashboard from "./pages/Dashboard"
import "./App.css"

export default function App() {
  const [page, setPage] = useState('home')
  if (page === 'dashboard') return <Dashboard onBack={() => setPage('home')} />
  return <HomePage onEnter={() => setPage('dashboard')} />
}
