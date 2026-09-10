import { useCallback, useEffect, useState } from 'react'
import { deleteTemplateItem, getDailyRoutine, getTemplate, listTemplateItems, onRoutineChanged, reorderTemplateItem, saveTemplateItem, setRoutineItemCompleted } from './api/routine'
import { RoutineTimeline } from './components/RoutineTimeline'
import { weekdays, type RoutineItem, type RoutineItemInput } from './types'
import './routine.css'

const todayKey = () => new Date().toLocaleDateString('en-CA')
const todayWeekday = () => {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

export function RoutinePage() {
  const [weekday, setWeekday] = useState(todayWeekday)
  const [items, setItems] = useState<RoutineItem[]>([])
  const [templateItems, setTemplateItems] = useState<RoutineItem[]>([])
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isToday = weekday === todayWeekday()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const template = await getTemplate(weekday)
      const nextTemplateItems = await listTemplateItems(template.id)
      const displayedItems = isToday ? await getDailyRoutine(todayKey()) : nextTemplateItems
      setTemplateId(template.id)
      setTemplateItems(nextTemplateItems)
      setItems(displayedItems)
    } catch (caught) {
      setItems([])
      setTemplateItems([])
      setError(caught instanceof Error ? caught.message : isToday ? '오늘의 루틴을 불러오지 못했습니다.' : '루틴 템플릿을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [isToday, weekday])

  useEffect(() => {
    void load()
    return onRoutineChanged(() => void load())
  }, [load])

  const completed = items.filter(item => item.completedAt).length
  const progress = items.length ? completed / items.length * 100 : 0

  async function save(input: RoutineItemInput, id?: string) {
    await saveTemplateItem(templateId, input, id)
  }

  async function remove(item: RoutineItem) {
    if (!window.confirm(`Delete “${item.title}” from the ${weekdays[weekday]} template?`)) return
    try {
      await deleteTemplateItem(item.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '루틴 항목을 삭제하지 못했습니다.')
    }
  }

  async function toggle(item: RoutineItem, value: boolean) {
    try {
      await setRoutineItemCompleted(item.id, value)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '루틴 완료 상태를 저장하지 못했습니다.')
    }
  }

  async function move(item: RoutineItem, direction: -1 | 1) {
    const index = templateItems.findIndex(candidate => candidate.id === item.id)
    try {
      await reorderTemplateItem(templateItems, item.id, index + direction)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '루틴 순서를 변경하지 못했습니다.')
    }
  }

  async function reorder(item: RoutineItem, targetIndex: number) {
    try {
      await reorderTemplateItem(templateItems, item.id, targetIndex)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '루틴 순서를 변경하지 못했습니다.')
    }
  }

  function templateItemFor(item: RoutineItem) {
    if (!isToday) return item
    return item.sourceItemId ? templateItems.find(templateItem => templateItem.id === item.sourceItemId) ?? null : null
  }

  return <div className="page routine-page">
    <div className="eyebrow">Your daily operating protocol</div>
    <h1 className="page-title">Routine</h1>
    <div className="weekday-tabs">{weekdays.map((day, index) => <button key={day} className={weekday === index ? 'active' : ''} onClick={() => setWeekday(index)}>{day.slice(0, 3)}</button>)}</div>

    {isToday && <section className="card routine-progress">
      <div><strong>{weekdays[weekday]}</strong><span className="meta">{completed} of {items.length} complete</span></div>
      <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
    </section>}

    <section className="routine-content card">
      <div className="card-head"><div><h2>{weekdays[weekday]} routine</h2><span className="meta">{isToday ? 'Today is a snapshot. Edits apply to future snapshots.' : 'Template changes apply to future daily snapshots.'}</span></div></div>
      {error
        ? <div className="routine-error" role="alert"><p className="feature-error">{error}</p><button className="button" onClick={() => void load()}>Retry</button></div>
        : loading
          ? <p className="empty-copy">Loading routine…</p>
          : <><RoutineTimeline
            key={`${weekday}-${isToday ? 'today' : 'template'}`}
            items={items}
            today={isToday}
            reorderable={!isToday}
            templateItemFor={templateItemFor}
            onToggle={(item, value) => void toggle(item, value)}
            onSave={save}
            onDelete={item => void remove(item)}
            onMove={(item, direction) => void move(item, direction)}
            onReorder={(item, targetIndex) => void reorder(item, targetIndex)}
          />{!items.length && <p className="empty-copy routine-empty-note">This routine is empty. Add the first step below.</p>}</>}
    </section>
  </div>
}
