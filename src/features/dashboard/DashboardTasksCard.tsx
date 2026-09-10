import { Link } from 'react-router-dom'
import { setTaskCompleted } from '../tasks/api/tasks'
import { collectDdayEntities } from '../tasks/model'
import { taskCategoryLabels } from '../tasks/types'
import { useTasks } from '../tasks/useTasks'

const ddayLabel = (dueDate: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(`${dueDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
  return days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

export function DashboardTasksCard() {
  const { projects, workstreams, tasks, loading, error } = useTasks()
  const open = tasks.filter(task => task.status !== 'done' && task.status !== 'dropped')
  const pinned = collectDdayEntities(projects, workstreams, tasks).filter(item => item.status !== 'done' && item.status !== 'dropped').slice(0, 3)
  const today = new Date().toLocaleDateString('en-CA')
  const actionable = open.filter(task => task.dueDate <= today).slice(0, 3)

  return <section className="card tasks-card">
    <div className="card-head"><h2>Projects & D-Day</h2><Link className="meta" to="/tasks">{loading ? 'Loading…' : `${projects.filter(project => project.status !== 'done' && project.status !== 'dropped').length} active`}</Link></div>
    {error ? <p className="meta">Project data unavailable.</p> : pinned.length ? <div className="task-list">{pinned.map(item => <Link className="task" to={item.kind === 'project' ? `/tasks/${item.id}` : `/tasks/${item.kind === 'workstream' ? workstreams.find(workstream => workstream.id === item.id)?.projectId : tasks.find(task => task.id === item.id)?.projectId}`} key={`${item.kind}-${item.id}`}><span><small className="task-path">{item.kind}</small>{item.title}</span><strong>{ddayLabel(item.dueDate)}</strong></Link>)}</div> : actionable.length ? <div className="task-list">{actionable.map(task => <label className="task" key={task.id}><input type="checkbox" checked={false} onChange={() => void setTaskCompleted(task.id, true)} /><span><small className="task-path">{taskCategoryLabels[task.category]}</small>{task.title}</span></label>)}</div> : <p className="meta">No pinned deadlines or overdue tasks.</p>}
  </section>
}
