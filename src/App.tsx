import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import { TasksPage } from './features/tasks/TasksPage'
import { RoutinePage } from './features/routine/RoutinePage'
import { HabitsPage } from './features/habits/HabitsPage'
import './App.css'
import { CalendarPage } from './features/calendar/CalendarPage'
const sections=['Caffeine','Stats','Settings']<Route path="calendar" element={<CalendarPage/>}/>
export default function App(){return <Routes><Route element={<AppShell/>}><Route index element={<DashboardPage/>}/><Route path="tasks" element={<TasksPage/>}/><Route path="routine" element={<RoutinePage/>}/><Route path="habits" element={<HabitsPage/>}/>{sections.map(s=><Route key={s} path={s.toLowerCase()} element={<PlaceholderPage title={s}/>}/>)}<Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
