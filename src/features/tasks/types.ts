export type Subject={id:string;name:string;color:string;archivedAt:string|null}
export type TaskCategory='study'|'personal'|'errands'|'development'|'other'
export type Task={id:string;title:string;category:TaskCategory;subjectId:string|null;dueAt:string|null;completedAt:string|null}
