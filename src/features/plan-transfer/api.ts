import { listAllEvents } from '../calendar/api/events'
import { listScheduleSubcategories } from '../calendar/api/subcategories'
import { dataApi } from '../../lib/neon/data'
import { listProjects, listSections, listSubjects, listTasks, listWorkstreams, notifyTasksChanged } from '../tasks/api/tasks'
import { buildStudyOsPlan } from './model'
import type { StudyOsPlan, TransferCounts } from './types'

export async function loadStudyOsPlan() {
  const [projects, workstreams, sections, tasks, subjects, subcategories, events] = await Promise.all([listProjects(), listWorkstreams(), listSections(), listTasks(), listSubjects(), listScheduleSubcategories(), listAllEvents()])
  return buildStudyOsPlan(projects, workstreams, sections, tasks, subjects, subcategories, events)
}

export async function importStudyOsPlan(payload: StudyOsPlan): Promise<TransferCounts> {
  const { data, error } = await dataApi.rpc('import_studyos_plan', { payload })
  if (error) throw new Error(error.message || '계획을 가져오지 못했습니다.')
  notifyTasksChanged()
  window.dispatchEvent(new Event('studyos:calendar-changed'))
  return data as TransferCounts
}
