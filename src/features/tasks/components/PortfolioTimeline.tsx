import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Pencil, Pin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { parseExpandedIds, projectProgress, timelinePlacement, workstreamProgress } from '../model'
import type { PlanningEntity, Project, Task, Workstream } from '../types'

const EXPANDED_KEY = 'studyos:portfolio-expanded'
const categoryColor = { study: '#719ce3', personal: '#a88bd8', errands: '#d4a15c', development: '#6eae91', other: '#89909a' }
const displayDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))

function TimelineRow({ entity, level, rangeStart, rangeEnd, timelineColor, progress, expandable, expanded, onExpand, onOpen, onEdit }: {
  entity: PlanningEntity; level: 'project' | 'workstream' | 'task'; rangeStart: string; rangeEnd: string; timelineColor?: string; progress?: { done: number; total: number; percent: number }; expandable?: boolean; expanded?: boolean; onExpand?: () => void; onOpen?: () => void; onEdit: () => void
}) {
  const placement = timelinePlacement(entity, rangeStart, rangeEnd)
  const style = { '--timeline-left': `${placement.left}%`, '--timeline-width': `${placement.width}%`, '--timeline-color': timelineColor ?? categoryColor[entity.category] } as CSSProperties
  return <div className={`portfolio-row ${level} ${entity.status}`}>
    <div className="portfolio-row-label">
      {expandable ? <button className="expand-button" onClick={onExpand} aria-label={expanded ? `Collapse ${entity.title}` : `Expand ${entity.title}`}>{expanded ? <ChevronDown /> : <ChevronRight />}</button> : <span className="expand-spacer" />}
      <button className="entity-name" onClick={onOpen}>{entity.title}</button>
      <button className="row-edit" onClick={onEdit} aria-label={`Edit ${entity.title}`}><Pencil /></button>
      <small>{entity.startDate ? `${displayDate(entity.startDate)} – ` : 'Due '}{displayDate(entity.dueDate)}</small>
      {progress && <small>{progress.total ? `${Math.round(progress.percent)}% · ${progress.done}/${progress.total}` : 'No tasks yet'}</small>}
      {entity.isDday && <Pin className="row-pin" aria-label="D-Day" />}
    </div>
    <div className="timeline-track">
      {placement.deadlineOnly
        ? <div className="deadline-marker" style={style}><i /><span>{entity.title}</span></div>
        : <div className="timeline-bar" style={style}><span>{entity.title}</span></div>}
    </div>
  </div>
}

export function PortfolioTimeline({ projects, workstreams, tasks, onEdit, forceExpanded = false }: {
  projects: Project[]; workstreams: Workstream[]; tasks: Task[]; onEdit: (kind: 'project' | 'workstream' | 'task', entity: PlanningEntity) => void; forceExpanded?: boolean
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(() => parseExpandedIds(localStorage.getItem(EXPANDED_KEY)))
  const all = [...projects, ...workstreams.filter(item => projects.some(project => project.id === item.projectId)), ...tasks.filter(item => projects.some(project => project.id === item.projectId))]
  const rangeStart = all.map(item => item.startDate ?? item.dueDate).sort()[0] ?? new Date().toLocaleDateString('en-CA')
  const rangeEnd = all.map(item => item.dueDate).sort().at(-1) ?? rangeStart
  const rangeStartMs = new Date(`${rangeStart}T00:00:00`).getTime()
  const rangeSpanMs = Math.max(1, new Date(`${rangeEnd}T00:00:00`).getTime() - rangeStartMs)
  const deadlines = tasks.filter(task => task.isDeadline && projects.some(project => project.id === task.projectId)).map(task => {
    const due = new Date(`${task.dueDate}T00:00:00`).getTime()
    return { task, left: Math.max(0, Math.min(100, (due - rangeStartMs) / rangeSpanMs * 100)) }
  }).sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))

  function toggle(id: string) {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next])); return next
    })
  }

  const rows: ReactNode[] = []
  for (const project of projects) {
    const projectWorkstreams = workstreams.filter(item => item.projectId === project.id).sort((a, b) => a.position - b.position)
    const directTasks = tasks.filter(item => item.projectId === project.id && !item.workstreamId).sort((a, b) => a.position - b.position)
    const projectExpanded = forceExpanded || expanded.has(project.id)
    rows.push(<TimelineRow key={`project-${project.id}`} entity={project} level="project" rangeStart={rangeStart} rangeEnd={rangeEnd} progress={projectProgress(project.id, tasks)} expandable={Boolean(projectWorkstreams.length || directTasks.length)} expanded={projectExpanded} onExpand={() => toggle(project.id)} onOpen={() => navigate(`/tasks/${project.id}`)} onEdit={() => onEdit('project', project)} />)
    if (!projectExpanded) continue
    for (const workstream of projectWorkstreams) {
      const nestedTasks = tasks.filter(item => item.workstreamId === workstream.id).sort((a, b) => a.position - b.position)
      const workstreamExpanded = forceExpanded || expanded.has(workstream.id)
      rows.push(<TimelineRow key={`workstream-${workstream.id}`} entity={workstream} level="workstream" rangeStart={rangeStart} rangeEnd={rangeEnd} timelineColor={workstream.subject?.color} progress={workstreamProgress(workstream.id, tasks)} expandable={Boolean(nestedTasks.length)} expanded={workstreamExpanded} onExpand={() => toggle(workstream.id)} onEdit={() => onEdit('workstream', workstream)} />)
      if (workstreamExpanded) nestedTasks.forEach(task => rows.push(<TimelineRow key={`task-${task.id}`} entity={task} level="task" rangeStart={rangeStart} rangeEnd={rangeEnd} onEdit={() => onEdit('task', task)} />))
    }
    directTasks.forEach(task => rows.push(<TimelineRow key={`task-${task.id}`} entity={task} level="task" rangeStart={rangeStart} rangeEnd={rangeEnd} onEdit={() => onEdit('task', task)} />))
  }

  return <div className="portfolio-timeline"><div className="timeline-range"><span>{displayDate(rangeStart)}</span><span>{displayDate(rangeEnd)}</span></div>{rows}<div className="timeline-deadline-layer" aria-label="Task deadlines">{deadlines.map(({ task, left }, index) => <div key={task.id} className={`timeline-deadline-guide${left > 72 ? ' align-left' : ''}`} style={{ '--deadline-left': `${left}%`, '--deadline-label-row': index } as CSSProperties}><span>{task.title} · {displayDate(task.dueDate)}</span></div>)}</div></div>
}
