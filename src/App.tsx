import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import { TasksPage } from './features/tasks/TasksPage'
import { RoutinePage } from './features/routine/RoutinePage'
import './App.css'
const sections=['Calendar','Habits','Caffeine','Stats','Settings']
export default function App(){return <Routes><Route element={<AppShell/>}><Route index element={<DashboardPage/>}/><Route path="tasks" element={<TasksPage/>}/><Route path="routine" element={<RoutinePage/>}/>{sections.map(s=><Route key={s} path={s.toLowerCase()} element={<PlaceholderPage title={s}/>}/>)}<Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
