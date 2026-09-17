import { useCallback, useEffect, useState } from 'react'
import { listProjects, listSections, listSubjects, listTasks, listWorkstreams, onTasksChanged } from './api/tasks'
import type { Project, Section, Subject, Task, Workstream } from './types'

export function useTasks() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setError('')
    try {
      const [nextProjects, nextWorkstreams, nextSections, nextTasks, nextSubjects] = await Promise.all([listProjects(), listWorkstreams(), listSections(), listTasks(), listSubjects()])
      setProjects(nextProjects); setWorkstreams(nextWorkstreams); setSections(nextSections); setTasks(nextTasks); setSubjects(nextSubjects)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load projects and tasks.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh(); return onTasksChanged(() => void refresh()) }, [refresh])
  return { projects, workstreams, sections, tasks, subjects, loading, error, refresh }
}
