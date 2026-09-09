import {
  useMemo,
  useState,
} from 'react'
import { SubjectManager } from './components/SubjectManager'
import { TaskComposer } from './components/TaskComposer'
import { TaskRow } from './components/TaskRow'
import { useTasks } from './useTasks'
import type {
  Task,
  TaskCategory,
} from './types'
import './tasks.css'

export function TasksPage() {
  const {
    tasks,
    subjects,
    loading,
    error,
  } = useTasks()

  const [editing, setEditing] =
    useState<Task | null>(null)

  const [view, setView] =
    useState<'open' | 'completed'>('open')

  const [composerCategory, setComposerCategory] =
    useState<TaskCategory>('study')

  const visible = useMemo(
    () =>
      tasks.filter(task =>
        view === 'completed'
          ? Boolean(task.completedAt)
          : !task.completedAt,
      ),
    [tasks, view],
  )

  const openCount =
    tasks.filter(task => !task.completedAt).length

  const showSubjects =
    composerCategory === 'study'

  return (
    <div className="page tasks-page">
      <div className="tasks-heading">
        <div>
          <div className="eyebrow">
            Plan and complete
          </div>

          <h1 className="page-title">
            Tasks
          </h1>
        </div>

        <div className="task-count tabular">
          {openCount} open
        </div>
      </div>

      <div
        className={`tasks-layout${
          showSubjects ? '' : ' full-width'
        }`}
      >
        <div className="tasks-main">
          <section className="card">
            <TaskComposer
              subjects={subjects}
              editing={editing}
              onDone={() => setEditing(null)}
              onCategoryChange={
                setComposerCategory
              }
            />
          </section>

          <div className="task-tabs">
            <button
              className={
                view === 'open'
                  ? 'active'
                  : ''
              }
              onClick={() => setView('open')}
            >
              Open
            </button>

            <button
              className={
                view === 'completed'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView('completed')
              }
            >
              Completed
            </button>
          </div>

          {error && (
            <div className="feature-error">
              {error}
            </div>
          )}

          <section className="task-rows">
            {loading ? (
              <p className="empty-copy">
                Loading tasks…
              </p>
            ) : visible.length ? (
              visible.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={setEditing}
                />
              ))
            ) : (
              <div className="empty-state">
                <h2>
                  {view === 'open'
                    ? 'Nothing pending'
                    : 'No completed tasks yet'}
                </h2>

                <p>
                  {view === 'open'
                    ? 'Your task list is clear.'
                    : 'Completed work will collect here.'}
                </p>
              </div>
            )}
          </section>
        </div>

        {showSubjects && (
          <aside>
            <SubjectManager
              subjects={subjects}
            />
          </aside>
        )}
      </div>
    </div>
  )
}