import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CalendarPage } from './features/calendar/CalendarPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { HabitsPage } from './features/habits/HabitsPage'
import { RoutinePage } from './features/routine/RoutinePage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import { TasksPage } from './features/tasks/TasksPage'
import './App.css'

const sections = ['Caffeine', 'Stats', 'Settings']

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="routine" element={<RoutinePage />} />
        <Route path="habits" element={<HabitsPage />} />

        {sections.map(section => (
          <Route
            key={section}
            path={section.toLowerCase()}
            element={<PlaceholderPage title={section} />}
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}