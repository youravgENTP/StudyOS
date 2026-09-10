import { useCallback, useEffect, useState } from 'react'
import { listProjects, listSubjects, listTasks, listWorkstreams, onTasksChanged } from './api/tasks'
import type { Project, Subject, Task, Workstream } from './types'

export function useTasks() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setError('')
    try {
      const [nextProjects, nextWorkstreams, nextTasks, nextSubjects] = await Promise.all([listProjects(), listWorkstreams(), listTasks(), listSubjects()])
      setProjects(nextProjects); setWorkstreams(nextWorkstreams); setTasks(nextTasks); setSubjects(nextSubjects)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load projects and tasks.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh(); return onTasksChanged(() => void refresh()) }, [refresh])
  return { projects, workstreams, tasks, subjects, loading, error, refresh }
}
