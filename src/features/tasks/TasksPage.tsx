import { useState } from 'react'
import { CalendarDays, List, Plus, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EntityEditor } from './components/EntityEditor'
import { SubjectManager } from './components/SubjectManager'
import { projectProgress, workstreamProgress } from './model'
import { useTasks } from './useTasks'
import type { PlanningEntity } from './types'
import './tasks.css'

type Editor = { kind: 'project' | 'workstream' | 'task'; entity?: PlanningEntity } | null
export function TasksPage() {
  const { projects, workstreams, sections, tasks, subjects, loading, error } = useTasks()
  const [filter, setFilter] = useState<'active' | 'all'>('active'); const [editor, setEditor] = useState<Editor>(null); const [subjectsOpen, setSubjectsOpen] = useState(false)
  const visibleProjects = filter === 'active' ? projects.filter(project => !['done', 'dropped'].includes(project.status)) : projects
  return <div className="page tasks-page"><div className="tasks-heading"><div><div className="eyebrow">Planning workspace</div><h1 className="page-title">Tasks</h1></div><div className="tasks-toolbar">
    <div className="detail-tabs" aria-label="Tasks view"><Link className="active" to="/tasks"><List size={14}/> List</Link><Link to="/tasks/calendar"><CalendarDays size={14}/> Calendar</Link></div>
    <div className="portfolio-filter"><button className={filter==='active'?'active':''} onClick={()=>setFilter('active')}>Active</button><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button></div><button className="button" onClick={()=>setSubjectsOpen(true)}><SlidersHorizontal size={15}/> Subjects</button><button className="button primary" onClick={()=>setEditor({kind:'project'})}><Plus size={16}/> Project</button>
  </div></div>{subjectsOpen&&<SubjectManager subjects={subjects} onClose={()=>setSubjectsOpen(false)}/>} {error&&<div className="feature-error">{error}</div>}
  {loading?<p className="empty-copy">Loading projects…</p>:<div className="project-summary-list">{visibleProjects.map(project=>{const children=workstreams.filter(item=>item.projectId===project.id).sort((a,b)=>a.position-b.position);const progress=projectProgress(project.id,tasks);return <article className="card project-summary" key={project.id}><Link className="project-summary-head" to={`/tasks/${project.id}`}><div><h2>{project.title}</h2><span>{project.startDate?`${project.startDate} – `:'Due '}{project.dueDate}</span></div><strong>{progress.done} / {progress.total}<small>{Math.round(progress.percent)}%</small></strong></Link><div className="project-workstream-preview">{children.map(workstream=>{const ws=workstreamProgress(workstream.id,tasks);const count=sections.filter(item=>item.workstreamId===workstream.id).length;return <Link to={`/tasks/${project.id}?workstream=${workstream.id}`} key={workstream.id}><span>{workstream.title}</span><small>{Math.round(ws.percent)}% · {count} section{count===1?'':'s'}</small></Link>})}{!children.length&&<span className="empty-copy">No Workstreams yet</span>}</div></article>})}{!visibleProjects.length&&<div className="card empty-state"><h2>No active projects</h2><p>Create a Project to begin planning.</p></div>}</div>}
  {editor&&<EntityEditor kind={editor.kind} editing={editor.entity??null} projects={projects} workstreams={workstreams} sections={sections} subjects={subjects} onClose={()=>setEditor(null)}/>}</div>
}
