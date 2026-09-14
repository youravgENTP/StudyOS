import { StudyTimerCard } from '../study-timer/StudyTimerCard'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { DashboardCaffeineCard } from './DashboardCaffeineCard'
import { DashboardHabitsCard } from './DashboardHabitsCard'
import { DashboardMajorSchedulesCard } from './DashboardMajorSchedulesCard'
import { DashboardQuoteCard } from './DashboardQuoteCard'
import { DashboardRoutineCard } from './DashboardRoutineCard'
import { DashboardTasksCard } from './DashboardTasksCard'

export function DashboardPage() {
  const mobile = useMediaQuery('(max-width: 760px)')
  const date = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  if (!mobile) return <div className="page"><div className="eyebrow">{date}</div><h1 className="page-title">Today</h1><div className="dashboard-grid"><div className="primary-column"><DashboardQuoteCard /><StudyTimerCard /><DashboardRoutineCard /><DashboardTasksCard /></div><aside className="secondary-column"><DashboardMajorSchedulesCard /><DashboardCaffeineCard /><DashboardHabitsCard /></aside></div></div>

  return <div className="page mobile-dashboard"><div className="eyebrow">{date}</div><h1 className="page-title">Today</h1><div className="mobile-dashboard-stack">
    <StudyTimerCard />
    <DashboardTasksCard mobile />
    <DashboardRoutineCard />
    <DashboardMajorSchedulesCard compact />
    <div className="mobile-dashboard-statuses"><DashboardCaffeineCard /><DashboardHabitsCard /></div>
    <DashboardQuoteCard />
  </div></div>
}
