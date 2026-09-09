import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import './App.css'
const sections=['Calendar','Tasks','Routine','Habits','Caffeine','Stats','Settings']
export default function App(){return <Routes><Route element={<AppShell/>}><Route index element={<DashboardPage/>}/>{sections.map(s=><Route key={s} path={s.toLowerCase()} element={<PlaceholderPage title={s}/>}/>)}<Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
