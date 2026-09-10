import { useMemo, useState, type DragEvent } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { RoutineItem, RoutineItemInput } from '../types'
import { RoutineItemForm } from './RoutineItemForm'

type Props = {
  items: RoutineItem[]
  today: boolean
  reorderable: boolean
  templateItemFor: (item: RoutineItem) => RoutineItem | null
  onToggle: (item: RoutineItem, completed: boolean) => void
  onSave: (input: RoutineItemInput, id?: string) => Promise<void>
  onDelete: (item: RoutineItem) => void
  onMove: (item: RoutineItem, direction: -1 | 1) => void
  onReorder: (item: RoutineItem, targetIndex: number) => void
}

function reorderedItems(items: RoutineItem[], draggedId: string | null, overId: string | null) {
  if (!draggedId || !overId || draggedId === overId) return items
  const from = items.findIndex(item => item.id === draggedId)
  const to = items.findIndex(item => item.id === overId)
  if (from < 0 || to < 0) return items
  const result = [...items]
  const [moved] = result.splice(from, 1)
  result.splice(to, 0, moved)
  return result
}

export function RoutineTimeline({ items, today, reorderable, templateItemFor, onToggle, onSave, onDelete, onMove, onReorder }: Props) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const visibleItems = useMemo(() => reorderedItems(items, draggedId, overId), [draggedId, items, overId])

  function startDrag(event: DragEvent, item: RoutineItem) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
    setDraggedId(item.id)
    setOverId(item.id)
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    if (draggedId && overId) {
      const dragged = items.find(item => item.id === draggedId)
      const targetIndex = items.findIndex(item => item.id === overId)
      if (dragged && targetIndex >= 0) onReorder(dragged, targetIndex)
    }
    setDraggedId(null)
    setOverId(null)
  }

  return <>
    <div className="routine-timeline" onDragEnd={() => { setDraggedId(null); setOverId(null) }}>
      {visibleItems.map((item, index) => {
        const templateItem = templateItemFor(item)
        const editing = editingRowId === item.id && templateItem
        return <article
          className={`routine-item${item.completedAt ? ' completed' : ''}${draggedId === item.id ? ' dragging' : ''}${overId === item.id && draggedId !== item.id ? ' drag-target' : ''}${editing ? ' editing' : ''}`}
          key={item.id}
          onDragEnter={() => { if (draggedId && reorderable && templateItem) setOverId(item.id) }}
          onDragOver={event => { if (draggedId && reorderable) event.preventDefault() }}
          onDrop={drop}
        >
          <div className="routine-time tabular">{item.scheduledTime ?? '—'}</div>
          <div className="routine-marker">{today
            ? <input type="checkbox" checked={Boolean(item.completedAt)} onChange={event => onToggle(item, event.target.checked)} aria-label={`Complete ${item.title}`} />
            : <span />}</div>
          {editing
            ? <div className="routine-editor-slot"><RoutineItemForm key={templateItem.id} editing={templateItem} onSave={onSave} onCancel={() => setEditingRowId(null)} /></div>
            : <><div className="routine-copy"><strong>{item.title}</strong>{item.details && <p>{item.details}</p>}</div>{templateItem && <div className="routine-actions">
              {reorderable && <button className="drag-handle" draggable onDragStart={event => startDrag(event, item)} aria-label={`Drag to reorder ${item.title}`}><GripVertical size={16} /></button>}
              {reorderable && <button disabled={index === 0} onClick={() => onMove(item, -1)} aria-label="Move up"><ChevronUp size={15} /></button>}
              {reorderable && <button disabled={index === items.length - 1} onClick={() => onMove(item, 1)} aria-label="Move down"><ChevronDown size={15} /></button>}
              <button onClick={() => { setAdding(false); setEditingRowId(item.id) }} aria-label="Edit"><Pencil size={15} /></button>
              <button onClick={() => onDelete(templateItem)} aria-label="Delete"><Trash2 size={15} /></button>
            </div>}</>}
        </article>
      })}
      {adding && <article className="routine-item editing adding">
        <div className="routine-time tabular">New</div><div className="routine-marker"><span /></div>
        <div className="routine-editor-slot"><RoutineItemForm key="new-routine-item" editing={null} onSave={onSave} onCancel={() => setAdding(false)} /></div>
      </article>}
    </div>
    {!adding && <button className="routine-add-row" onClick={() => { setEditingRowId(null); setAdding(true) }}><Plus size={16} /> Add routine</button>}
  </>
}
