export type TaskCategory = 'study' | 'personal' | 'errands' | 'development' | 'other'
export type Subject = { id:string; name:string; color:string; archivedAt:string|null }
export type Task = { id:string; title:string; category:TaskCategory; subjectId:string|null; subject:Subject|null; dueDate:string|null; completedAt:string|null; createdAt:string }
export type TaskInput = { title:string; category:TaskCategory; subjectId:string|null; dueDate:string|null }
export const taskCategoryLabels:Record<TaskCategory,string>={study:'Study',personal:'Personal',errands:'Errands',development:'Development',other:'Other'}
