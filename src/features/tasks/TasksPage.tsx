import { useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { EntityEditor } from './components/EntityEditor'
import { PortfolioTimeline } from './components/PortfolioTimeline'
import { SubjectManager } from './components/SubjectManager'
import { useTasks } from './useTasks'
import type { PlanningEntity } from './types'
import './tasks.css'

type Editor = { kind: 'project' | 'workstream' | 'task'; entity?: PlanningEntity } | null

export function TasksPage() {
  const { projects, workstreams, tasks, subjects, loading, error } = useTasks()
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [editor, setEditor] = useState<Editor>(null)
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const visibleProjects = filter === 'active' ? projects.filter(project => project.status !== 'done' && project.status !== 'dropped') : projects

  return <div className="page tasks-page">
    <div className="tasks-heading">
      <div><div className="eyebrow">Long-range planning</div><h1 className="page-title">Portfolio</h1></div>
      <div className="tasks-toolbar">
        <div className="portfolio-filter"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button></div>
        <button className="button" onClick={() => setSubjectsOpen(true)}><SlidersHorizontal size={15} /> Subjects</button>
        <button className="button primary" onClick={() => setEditor({ kind: 'project' })}><Plus size={16} /> Project</button>
      </div>
    </div>
    {subjectsOpen && <SubjectManager subjects={subjects} onClose={() => setSubjectsOpen(false)} />}
    {error && <div className="feature-error">{error}</div>}
    <section className="card portfolio-card">
      {loading ? <p className="empty-copy">Loading portfolio…</p> : visibleProjects.length
        ? <PortfolioTimeline projects={visibleProjects} workstreams={workstreams} tasks={tasks} onEdit={(kind, entity) => setEditor({ kind, entity })} />
        : <div className="empty-state"><h2>No active projects</h2><p>Create a project to begin planning long-running work.</p></div>}
    </section>
    {editor && <EntityEditor kind={editor.kind} editing={editor.entity ?? null} projects={projects} workstreams={workstreams} subjects={subjects} onClose={() => setEditor(null)} />}
  </div>
}
