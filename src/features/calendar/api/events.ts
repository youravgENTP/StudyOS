import { dataApi } from '../../../lib/neon/data'
import type { Subject } from '../../tasks/types'
import type {
  CalendarEvent,
  CalendarEventInput,
  ScheduleSubcategory,
} from '../types'

const CHANGED = 'studyos:calendar-changed'

function notifyCalendarChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

export function onCalendarChanged(listener: () => void) {
  window.addEventListener(CHANGED, listener)

  return () => {
    window.removeEventListener(CHANGED, listener)
  }
}

function failure(error: unknown) {
  return new Error(
    error &&
      typeof error === 'object' &&
      'message' in error
      ? String(error.message)
      : 'Calendar request failed',
  )
}

function mapSubject(row: Record<string, unknown>): Subject {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    academicYear: Number(row.academic_year ?? 2026),
    academicTerm: (row.academic_term ?? '2') as Subject['academicTerm'],
    archivedAt: row.archived_at ? String(row.archived_at) : null,
  }
}

function mapEvent(row: Record<string, unknown>): CalendarEvent {
  const relation = Array.isArray(row.subjects)
    ? row.subjects[0]
    : row.subjects
  const subcategoryRelation = Array.isArray(row.schedule_subcategories)
    ? row.schedule_subcategories[0]
    : row.schedule_subcategories

  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as CalendarEvent['category'],
    subjectId: row.subject_id ? String(row.subject_id) : null,
    subject: relation
      ? mapSubject(relation as Record<string, unknown>)
      : null,
    subcategoryId: row.subcategory_id ? String(row.subcategory_id) : null,
    subcategory: subcategoryRelation ? mapSubcategory(subcategoryRelation as Record<string, unknown>) : null,
    allDay: Boolean(row.all_day),
    startDate: String(row.start_date),
    startTime: row.start_time ? String(row.start_time) : null,
    endDate: String(row.end_date),
    endTime: row.end_time ? String(row.end_time) : null,
    isMajor: Boolean(row.is_major),
    displayStyle: row.display_style === 'bar' ? 'bar' : 'compact',
    createdAt: String(row.created_at),
  }
}

function mapSubcategory(row: Record<string, unknown>): ScheduleSubcategory {
  return { id: String(row.id), category: row.category as ScheduleSubcategory['category'], name: String(row.name), color: String(row.color), position: Number(row.position), archivedAt: row.archived_at ? String(row.archived_at) : null }
}

const eventSelection = 'id,title,category,subject_id,subcategory_id,all_day,start_date,start_time,end_date,end_time,is_major,display_style,created_at,subjects(id,name,color,academic_year,academic_term,archived_at),schedule_subcategories(id,category,name,color,position,archived_at)'

export async function listEvents(
  from: string,
  to: string,
) {
  const { data, error } = await dataApi
    .from('events')
    .select(eventSelection)
    .lte('start_date', to)
    .gte('end_date', from)
    .order('start_date')
    .order('start_time')

  if (error) {
    throw failure(error)
  }

  return (data ?? []).map(row =>
    mapEvent(row as Record<string, unknown>),
  )
}

export async function listAllEvents() {
  const { data, error } = await dataApi.from('events').select(eventSelection).order('start_date').order('start_time')
  if (error) throw failure(error)
  return (data ?? []).map(row => mapEvent(row as Record<string, unknown>))
}

export async function createEvent(
  input: CalendarEventInput,
) {
  const { error } = await dataApi
    .from('events')
    .insert({
      title: input.title.trim(),
      category: input.category,
      subject_id:
        input.category === 'study'
          ? input.subjectId
          : null,
      subcategory_id: input.subcategoryId,
      all_day: input.allDay,
      start_date: input.startDate,
      start_time: input.allDay
        ? null
        : input.startTime,
      end_date: input.endDate,
      end_time: input.allDay
        ? null
        : input.endTime,
      is_major: input.isMajor,
      display_style: input.displayStyle,
    })

  if (error) {
    throw failure(error)
  }

  notifyCalendarChanged()
}

export async function updateEvent(
  id: string,
  input: CalendarEventInput,
) {
  const { error } = await dataApi
    .from('events')
    .update({
      title: input.title.trim(),
      category: input.category,
      subject_id:
        input.category === 'study'
          ? input.subjectId
          : null,
      subcategory_id: input.subcategoryId,
      all_day: input.allDay,
      start_date: input.startDate,
      start_time: input.allDay
        ? null
        : input.startTime,
      end_date: input.endDate,
      end_time: input.allDay
        ? null
        : input.endTime,
      is_major: input.isMajor,
      display_style: input.displayStyle,
    })
    .eq('id', id)

  if (error) {
    throw failure(error)
  }

  notifyCalendarChanged()
}

export async function deleteEvent(id: string) {
  const { error } = await dataApi
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    throw failure(error)
  }

  notifyCalendarChanged()
}

export async function moveEventsToSubcategory(ids: string[], subcategoryId: string | null, category?: CalendarEvent['category']) {
  const patch: Record<string, unknown> = { subcategory_id: subcategoryId }
  if (category) { patch.category = category; if (category !== 'study') patch.subject_id = null }
  const results = await Promise.all(ids.map(id => dataApi.from('events').update(patch).eq('id', id)))
  const failed = results.find(result => result.error)
  if (failed?.error) throw failure(failed.error)
  notifyCalendarChanged()
}
