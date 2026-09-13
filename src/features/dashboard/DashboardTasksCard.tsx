import { Link } from 'react-router-dom'
import { setTaskCompleted } from '../tasks/api/tasks'
import { collectDdayEntities } from '../tasks/model'
import { taskCategoryLabels } from '../tasks/types'
import { useTasks } from '../tasks/useTasks'
import { ddayLabel } from './date'

export function DashboardTasksCard() {
  const { projects, workstreams, tasks, loading, error } = useTasks()
  const open = tasks.filter(task => task.status !== 'done' && task.status !== 'dropped')
  const pinned = collectDdayEntities(projects, workstreams, tasks).filter(item => item.status !== 'done' && item.status !== 'dropped').slice(0, 5)
  const today = new Date().toLocaleDateString('en-CA')
  const actionable = open.filter(task => task.dueDate <= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3)
  const projectPath = (kind: 'project' | 'workstream' | 'task', id: string) => kind === 'project' ? `/tasks/${id}` : `/tasks/${kind === 'workstream' ? workstreams.find(item => item.id === id)?.projectId : tasks.find(item => item.id === id)?.projectId}`

  return <section className="card tasks-card">
    <div className="card-head"><div><h2>Pinned Deadlines</h2><span className="dashboard-card-caption">Pinned Project, Workflow, and Task deadlines</span></div><Link className="meta" to="/tasks">{loading ? 'Loading…' : `${pinned.length} pinned`}</Link></div>
    {error ? <p className="meta">Project data unavailable.</p> : pinned.length ? <div className="deadline-list">{pinned.map(item => <Link className="deadline-row" to={projectPath(item.kind, item.id)} key={`${item.kind}-${item.id}`}><small>{item.kind === 'workstream' ? 'workflow' : item.kind}</small><span><strong>{item.title}</strong><time>{item.dueDate}</time></span><b className="tabular">{ddayLabel(item.dueDate)}</b></Link>)}</div> : actionable.length ? <div className="task-list">{actionable.map(task => <label className="task" key={task.id}><input type="checkbox" checked={false} onChange={() => void setTaskCompleted(task.id, true)} /><span><small className="task-path">{taskCategoryLabels[task.category]}</small>{task.title}</span></label>)}</div> : <p className="meta">No pinned deadlines or overdue tasks.</p>}
  </section>
}
