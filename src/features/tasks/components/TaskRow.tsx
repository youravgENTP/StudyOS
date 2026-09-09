import {
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  deleteTask,
  setTaskCompleted,
  setTaskDday,
} from '../api/tasks'
import {
  taskCategoryLabels,
  type Task,
} from '../types'

function dueLabel(date: string | null) {
  if (!date) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(`${date}T00:00:00`)

  const days = Math.round(
    (due.getTime() - today.getTime()) /
      86400000,
  )

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'

  if (days < 0) {
    return `${Math.abs(days)}d overdue`
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(due)
}

export function TaskRow({
  task,
  onEdit,
}: {
  task: Task
  onEdit: (task: Task) => void
}) {
  async function remove() {
    if (
      window.confirm(
        `Delete “${task.title}”?`,
      )
    ) {
      await deleteTask(task.id)
    }
  }

  return (
    <article
      className={`task-row${
        task.completedAt
          ? ' completed'
          : ''
      }`}
    >
      <input
        className="task-check"
        type="checkbox"
        checked={Boolean(task.completedAt)}
        onChange={event =>
          void setTaskCompleted(
            task.id,
            event.target.checked,
          )
        }
        aria-label={`Complete ${task.title}`}
      />

      <div className="task-content">
        <div className="task-title">
          {task.title}
        </div>

        <div className="task-details">
          <span>
            {taskCategoryLabels[task.category]}
          </span>

          {task.subject && (
            <span className="subject-chip">
              <i
                style={{
                  background:
                    task.subject.color,
                }}
              />
              {task.subject.name}
            </span>
          )}

          {task.dueDate && (
            <span
              className={
                dueLabel(
                  task.dueDate,
                ).includes('overdue')
                  ? 'overdue'
                  : ''
              }
            >
              {dueLabel(task.dueDate)}
            </span>
          )}

          {task.dueDate && (
            <label className="task-dday">
              <input
                type="checkbox"
                checked={task.isDday}
                onChange={event =>
                  void setTaskDday(
                    task.id,
                    event.target.checked,
                  )
                }
              />
              D-Day
            </label>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
        >
          <Pencil size={15} />
        </button>

        <button
          onClick={remove}
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}