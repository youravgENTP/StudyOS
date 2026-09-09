export type Habit={id:string;name:string;color:string;weekdays:number[]}
export type HabitCompletion={habitId:string;date:string}
export const shortWeekdays=['M','T','W','T','F','S','S']as const
