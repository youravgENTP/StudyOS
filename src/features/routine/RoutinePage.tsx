import { useCallback, useEffect, useState } from 'react'
import { deleteTemplateItem, getDailyRoutine, getTemplate, listTemplateItems, moveTemplateItem, onRoutineChanged, saveTemplateItem, setRoutineItemCompleted } from './api/routine'
import { RoutineItemForm } from './components/RoutineItemForm'
import { RoutineTimeline } from './components/RoutineTimeline'
import { weekdays, type RoutineItem, type RoutineItemInput } from './types'
import './routine.css'
import './routine-layout.css'

const today = () => new Date().toLocaleDateString('en-CA')
const todayWeekday = () => {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

export function RoutinePage() {
  const [mode, setMode] = useState<'today' | 'template'>('today')
  const [weekday, setWeekday] = useState(todayWeekday)
  const [items, setItems] = useState<RoutineItem[]>([])
  const [templateId, setTemplateId] = useState('')
  const [editing, setEditing] = useState<RoutineItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'today') {
        setItems(await getDailyRoutine(today()))
      } else {
        const template = await getTemplate(weekday)
        setTemplateId(template.id)
        setItems(await listTemplateItems(template.id))
      }
    } catch (caught) {
      setItems([])
      setError(caught instanceof Error ? caught.message : mode === 'today' ? '오늘의 루틴을 불러오지 못했습니다.' : '루틴 템플릿을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [mode, weekday])

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
    try { await deleteTemplateItem(item.id) } catch (caught) { setError(caught instanceof Error ? caught.message : '루틴 항목을 삭제하지 못했습니다.') }
  }

  async function toggle(item: RoutineItem, value: boolean) {
    try { await setRoutineItemCompleted(item.id, value) } catch (caught) { setError(caught instanceof Error ? caught.message : '루틴 완료 상태를 저장하지 못했습니다.') }
  }

  async function move(item: RoutineItem, direction: -1 | 1) {
    try { await moveTemplateItem(items, item.id, direction) } catch (caught) { setError(caught instanceof Error ? caught.message : '루틴 순서를 변경하지 못했습니다.') }
  }

  let timelineBody
  if (error) {
    timelineBody = <div className="routine-error" role="alert"><p className="feature-error">{error}</p><button className="button" onClick={() => void load()}>Retry</button></div>
  } else if (loading) {
    timelineBody = <p className="empty-copy">Loading routine…</p>
  } else if (items.length) {
    timelineBody = <RoutineTimeline items={items} editable={mode === 'template'} onToggle={(item, value) => void toggle(item, value)} onEdit={setEditing} onDelete={item => void remove(item)} onMove={(item, direction) => void move(item, direction)} />
  } else {
    timelineBody = <div className="empty-state"><h2>{mode === 'today' ? 'No routine for today' : 'This template is empty'}</h2><p>{mode === 'today' ? `Add steps to the ${weekdays[todayWeekday()]} template.` : 'Use the form beside this template to add the first step.'}</p></div>
  }

  const timeline = <section className="routine-content card">
    <div className="card-head"><div><h2>{mode === 'today' ? "Today's routine" : `${weekdays[weekday]} template`}</h2><span className="meta">{mode === 'today' ? 'A snapshot—later template edits will not change today.' : 'Changes apply to future daily snapshots.'}</span></div></div>
    {timelineBody}
  </section>

  return <div className="page routine-page">
    <div className="routine-heading">
      <div><div className="eyebrow">Your daily operating protocol</div><h1 className="page-title">Routine</h1></div>
      <div className="routine-mode"><button className={mode === 'today' ? 'active' : ''} onClick={() => { setMode('today'); setEditing(null) }}>Today</button><button className={mode === 'template' ? 'active' : ''} onClick={() => setMode('template')}>Edit templates</button></div>
    </div>
    {mode === 'template' && <div className="weekday-tabs">{weekdays.map((day, index) => <button key={day} className={weekday === index ? 'active' : ''} onClick={() => { setWeekday(index); setEditing(null) }}>{day.slice(0, 3)}</button>)}</div>}
    {mode === 'today'
      ? <><section className="card routine-progress"><div><strong>{weekdays[todayWeekday()]}</strong><span className="meta">{completed} of {items.length} complete</span></div><div className="progress-line"><span style={{ width: `${progress}%` }} /></div></section>{timeline}</>
      : <div className="routine-editor-grid">{timeline}<RoutineItemForm editing={editing} onSave={save} onCancel={() => setEditing(null)} /></div>}
  </div>
}
