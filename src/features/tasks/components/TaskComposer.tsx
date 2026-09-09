import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
  createTask,
  updateTask,
} from '../api/tasks'
import {
  taskCategoryLabels,
  type Subject,
  type Task,
  type TaskCategory,
} from '../types'

type Props = {
  subjects: Subject[]
  editing: Task | null
  onDone: () => void
  onCategoryChange: (category: TaskCategory) => void
}

export function TaskComposer({
  subjects,
  editing,
  onDone,
  onCategoryChange,
}: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] =
    useState<TaskCategory>('study')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isDday, setIsDday] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const nextCategory =
      editing?.category ?? 'study'

    setTitle(editing?.title ?? '')
    setCategory(nextCategory)
    setSubjectId(editing?.subjectId ?? '')
    setDueDate(editing?.dueDate ?? '')
    setIsDday(editing?.isDday ?? false)

    onCategoryChange(nextCategory)
  }, [editing, onCategoryChange])

  function changeCategory(next: TaskCategory) {
    setCategory(next)
    onCategoryChange(next)

    if (next !== 'study') {
      setSubjectId('')
    }
  }

  function changeDueDate(next: string) {
    setDueDate(next)

    if (!next) {
      setIsDday(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const input = {
      title,
      category,
      subjectId:
        category === 'study' && subjectId
          ? subjectId
          : null,
      dueDate: dueDate || null,
      isDday: Boolean(dueDate && isDday),
    }

    try {
      if (editing) {
        await updateTask(editing.id, input)
      } else {
        await createTask(input)
      }

      setTitle('')
      setDueDate('')
      setIsDday(false)

      if (!editing) {
        setSubjectId('')
      }

      onDone()
    } catch {
      setError(
        'Could not save this task. Check for duplicate or invalid values.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="task-composer"
      onSubmit={submit}
    >
      <div className="composer-title">
        <input
          value={title}
          onChange={event =>
            setTitle(event.target.value)
          }
          placeholder="What needs to be done?"
          maxLength={240}
          required
        />

        <button
          className="button primary"
          disabled={saving}
        >
          {saving
            ? 'Saving…'
            : editing
              ? 'Save'
              : 'Add task'}
        </button>
      </div>

      <div className="composer-fields">
        <select
          value={category}
          onChange={event =>
            changeCategory(
              event.target.value as TaskCategory,
            )
          }
        >
          {Object.entries(taskCategoryLabels).map(
            ([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ),
          )}
        </select>

        {category === 'study' && (
          <select
            value={subjectId}
            onChange={event =>
              setSubjectId(event.target.value)
            }
          >
            <option value="">No subject</option>

            {subjects.map(subject => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.name}
              </option>
            ))}
          </select>
        )}

        <label>
          Due
          <input
            type="date"
            value={dueDate}
            onChange={event =>
              changeDueDate(event.target.value)
            }
          />
        </label>

        <label className="dday-field">
          <input
            type="checkbox"
            checked={isDday}
            disabled={!dueDate}
            onChange={event =>
              setIsDday(event.target.checked)
            }
          />
          D-Day
        </label>

        {editing && (
          <button
            type="button"
            className="text-button"
            onClick={onDone}
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}
    </form>
  )
}