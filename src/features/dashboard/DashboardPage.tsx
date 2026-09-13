import { StudyTimerCard } from '../study-timer/StudyTimerCard'
import { DashboardCaffeineCard } from './DashboardCaffeineCard'
import { DashboardHabitsCard } from './DashboardHabitsCard'
import { DashboardMajorSchedulesCard } from './DashboardMajorSchedulesCard'
import { DashboardQuoteCard } from './DashboardQuoteCard'
import { DashboardRoutineCard } from './DashboardRoutineCard'
import { DashboardTasksCard } from './DashboardTasksCard'

export function DashboardPage() {
  const date = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  return <div className="page"><div className="eyebrow">{date}</div><h1 className="page-title">Today</h1><div className="dashboard-grid"><div className="primary-column"><DashboardQuoteCard /><StudyTimerCard /><DashboardRoutineCard /><DashboardTasksCard /></div><aside className="secondary-column"><DashboardMajorSchedulesCard /><DashboardCaffeineCard /><DashboardHabitsCard /></aside></div></div>
}
