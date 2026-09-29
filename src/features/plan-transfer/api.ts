import { listAllEvents } from '../calendar/api/events'
import { listScheduleSubcategories } from '../calendar/api/subcategories'
import { dataApi } from '../../lib/neon/data'
import { listProjects, listSections, listSubjects, listTasks, listWorkstreams, notifyTasksChanged } from '../tasks/api/tasks'
import { buildStudyOsPlan } from './model'
import type { ImportMode, ImportResult, StudyOsPlan } from './types'

export async function loadStudyOsPlan() {
  const [projects, workstreams, sections, tasks, subjects, subcategories, events] = await Promise.all([listProjects(), listWorkstreams(), listSections(), listTasks(), listSubjects(), listScheduleSubcategories(), listAllEvents()])
  return buildStudyOsPlan(projects, workstreams, sections, tasks, subjects, subcategories, events)
}

export async function importStudyOsPlan(payload: StudyOsPlan, importMode: ImportMode): Promise<ImportResult> {
  const { data, error } = await dataApi.rpc('import_studyos_plan_v2', { payload, import_mode: importMode })
  if (error) throw new Error(error.message || '계획을 가져오지 못했습니다.')
  notifyTasksChanged()
  window.dispatchEvent(new Event('studyos:calendar-changed'))
  return data as ImportResult
}
