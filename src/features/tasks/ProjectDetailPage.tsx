import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronUp, Pencil, Pin, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { reorderEntities, setEntityDday, setEntityStatus, setTaskCompleted } from './api/tasks'
import { EntityEditor } from './components/EntityEditor'
import { PortfolioTimeline } from './components/PortfolioTimeline'
import { dateWarnings, projectProgress, workstreamProgress } from './model'
import { taskStatusLabels, type PlanningEntity, type Project, type Task, type Workstream } from './types'
import { useTasks } from './useTasks'
import './tasks.css'

type Editor = { kind: 'project' | 'workstream' | 'task'; entity?: PlanningEntity; workstream?: Workstream | null } | null
const dateText = (item: PlanningEntity) => item.startDate ? `${item.startDate} – ${item.dueDate}` : `Due ${item.dueDate}`

function OrderButtons({ items, item, table }: { items: PlanningEntity[]; item: PlanningEntity; table: 'workstreams' | 'tasks' }) {
  const index = items.findIndex(candidate => candidate.id === item.id)
  return <span className="order-buttons"><button disabled={index <= 0} onClick={() => void reorderEntities(table, items, item.id, index - 1)} aria-label={`Move ${item.title} up`}><ChevronUp /></button><button disabled={index < 0 || index === items.length - 1} onClick={() => void reorderEntities(table, items, item.id, index + 1)} aria-label={`Move ${item.title} down`}><ChevronDown /></button></span>
}

function StatusControl({ table, entity }: { table: 'projects' | 'workstreams' | 'tasks'; entity: PlanningEntity }) {
  return <select className="status-control" value={entity.status} onChange={event => void setEntityStatus(table, entity.id, event.target.value as PlanningEntity['status'])}>{Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
}

function TaskLine({ task, siblings, project, workstream, onEdit }: { task: Task; siblings: Task[]; project: Project; workstream?: Workstream | null; onEdit: () => void }) {
  const warnings = dateWarnings(task, project, workstream)
  return <div className={`project-task-line ${task.status}`}>
    <input className="task-completion" type="checkbox" checked={task.status === 'done'} onChange={event => void setTaskCompleted(task.id, event.target.checked)} aria-label={`Mark ${task.title} ${task.status === 'done' ? 'incomplete' : 'complete'}`} />
    <OrderButtons items={siblings} item={task} table="tasks" />
    <div><strong>{task.title}</strong><small>{dateText(task)} · {task.category}{task.isDeadline ? ' · Timeline deadline' : ''}</small>{warnings.map(warning => <span className="date-warning" key={warning}>{warning}</span>)}</div>
    <StatusControl table="tasks" entity={task} />
    <button className={task.isDday ? 'active pin-button' : 'pin-button'} onClick={() => void setEntityDday('tasks', task.id, !task.isDday)} aria-label="Toggle D-Day"><Pin /></button>
    <button onClick={onEdit} aria-label={`Edit ${task.title}`}><Pencil /></button>
  </div>
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const { projects, workstreams, tasks, subjects, loading, error } = useTasks()
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [editor, setEditor] = useState<Editor>(null)
  const project = projects.find(item => item.id === projectId)
  if (loading) return <div className="page"><p className="empty-copy">Loading project…</p></div>
  if (!project) return <div className="page"><Link to="/tasks">← Portfolio</Link><div className="empty-state"><h2>Project not found</h2><p>{error || 'This project may have been removed.'}</p></div></div>
  const projectWorkstreams = workstreams.filter(item => item.projectId === project.id).sort((a, b) => a.position - b.position)
  const projectTasks = tasks.filter(item => item.projectId === project.id)
  const directTasks = projectTasks.filter(item => !item.workstreamId).sort((a, b) => a.position - b.position)
  const progress = projectProgress(project.id, tasks)

  return <div className="page tasks-page project-detail-page">
    <Link className="back-link" to="/tasks"><ChevronLeft /> Portfolio</Link>
    <div className="project-detail-heading">
      <div><div className="eyebrow">{project.category} · {dateText(project)}</div><h1 className="page-title">{project.title}</h1><p>{progress.total ? `${progress.done} of ${progress.total} tasks · ${Math.round(progress.percent)}%` : 'No tasks yet'}</p></div>
      <div className="project-detail-actions"><StatusControl table="projects" entity={project} /><button className="button" onClick={() => setEditor({ kind: 'project', entity: project })}><Pencil size={15} /> Edit</button><button className="button" onClick={() => setEditor({ kind: 'workstream' })}><Plus size={15} /> Workstream</button><button className="button primary" onClick={() => setEditor({ kind: 'task', workstream: null })}><Plus size={15} /> Task</button></div>
    </div>
    {progress.total > 0 && progress.done === progress.total && project.status !== 'done' && <div className="completion-suggestion">All tasks are complete. Mark this Project as done?</div>}
    <div className="detail-tabs"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>Timeline</button></div>
    {view === 'timeline' ? <section className="card portfolio-card"><PortfolioTimeline projects={[project]} workstreams={projectWorkstreams} tasks={projectTasks} forceExpanded onEdit={(kind, entity) => setEditor({ kind, entity })} /></section> : <section className="project-list">
      {projectWorkstreams.map(workstream => {
        const nested = projectTasks.filter(task => task.workstreamId === workstream.id).sort((a, b) => a.position - b.position)
        const wsProgress = workstreamProgress(workstream.id, tasks)
        const warnings = dateWarnings(workstream, project)
        return <article className="card workstream-section" key={workstream.id}>
          <header><OrderButtons items={projectWorkstreams} item={workstream} table="workstreams" /><div><h2>{workstream.title}</h2><span>{dateText(workstream)} · {wsProgress.total ? `${Math.round(wsProgress.percent)}%` : 'No tasks yet'}{workstream.subject ? ` · ${workstream.subject.name}` : ''}</span>{warnings.map(warning => <span className="date-warning" key={warning}>{warning}</span>)}</div><StatusControl table="workstreams" entity={workstream} /><button className={workstream.isDday ? 'active pin-button' : 'pin-button'} onClick={() => void setEntityDday('workstreams', workstream.id, !workstream.isDday)}><Pin /></button><button onClick={() => setEditor({ kind: 'workstream', entity: workstream })}><Pencil /></button><button className="button" onClick={() => setEditor({ kind: 'task', workstream })}><Plus size={15} /> Task</button></header>
          {wsProgress.total > 0 && wsProgress.done === wsProgress.total && workstream.status !== 'done' && <div className="completion-suggestion">All tasks are complete. Mark this Workstream as done?</div>}
          <div className="project-task-list">{nested.length ? nested.map(task => <TaskLine key={task.id} task={task} siblings={nested} project={project} workstream={workstream} onEdit={() => setEditor({ kind: 'task', entity: task, workstream })} />) : <p className="empty-copy">No tasks in this workstream.</p>}</div>
        </article>
      })}
      <article className="card workstream-section direct-tasks"><header><div><h2>Direct project tasks</h2><span>Tasks that do not need a workstream</span></div><button className="button" onClick={() => setEditor({ kind: 'task', workstream: null })}><Plus size={15} /> Task</button></header><div className="project-task-list">{directTasks.length ? directTasks.map(task => <TaskLine key={task.id} task={task} siblings={directTasks} project={project} onEdit={() => setEditor({ kind: 'task', entity: task })} />) : <p className="empty-copy">No direct tasks.</p>}</div></article>
    </section>}
    {editor && <EntityEditor kind={editor.kind} editing={editor.entity ?? null} project={project} workstream={editor.workstream} projects={projects} workstreams={workstreams} subjects={subjects} onClose={() => setEditor(null)} />}
  </div>
}
