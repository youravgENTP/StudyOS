export type RoutineTemplate={id:string;weekday:number}
export type RoutineItem={id:string;sourceItemId?:string|null;position:number;scheduledTime:string|null;title:string;details:string|null;completedAt?:string|null}
export type RoutineItemInput={title:string;scheduledTime:string|null;details:string|null}
export const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']as const
