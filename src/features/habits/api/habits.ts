import{dataApi}from'../../../lib/neon/data';import type{Habit,HabitCompletion}from'../types'
const CHANGED='studyos:habits-changed';const notify=()=>window.dispatchEvent(new Event(CHANGED));export function onHabitsChanged(fn:()=>void){window.addEventListener(CHANGED,fn);return()=>window.removeEventListener(CHANGED,fn)}function fail(error:unknown){return new Error(error&&typeof error==='object'&&'message'in error?String(error.message):'Habit request failed')}
export async function listHabits() {
  const { data, error } = await dataApi
    .from('habit_definitions')
    .select('id,name,color,weekdays,tracking_mode,created_at')
    .is('archived_at', null)
    .order('created_at')

  if (error) throw fail(error)

  return (data ?? []).map(row => ({
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    weekdays:
      (row.weekdays as number[]) ?? [],
    createdAt: String(row.created_at),
    trackingMode: (row.tracking_mode ?? 'binary') as Habit['trackingMode'],
  })) as Habit[]
}
export async function saveHabit(name:string,color:string,weekdays:number[],trackingMode:Habit['trackingMode'],id?:string){const values={name:name.trim(),color,weekdays,tracking_mode:trackingMode};const{error}=id?await dataApi.from('habit_definitions').update(values).eq('id',id):await dataApi.from('habit_definitions').insert(values);if(error)throw fail(error);notify()}
export async function archiveHabit(id:string){const{error}=await dataApi.from('habit_definitions').update({archived_at:new Date().toISOString()}).eq('id',id);if(error)throw fail(error);notify()}
export async function listCompletions(from:string,to:string){const{data,error}=await dataApi.from('habit_daily_records').select('habit_id,record_date,value').gte('record_date',from).lte('record_date',to);if(error)throw fail(error);return(data??[]).map(row=>({habitId:String(row.habit_id),date:String(row.record_date),value:Number(row.value)}))as HabitCompletion[]}
export async function setHabitValue(habitId:string,date:string,value:number){const safe=Math.max(0,Math.floor(value));const result=safe>0?await dataApi.from('habit_daily_records').upsert({habit_id:habitId,record_date:date,value:safe},{onConflict:'user_id,habit_id,record_date'}):await dataApi.from('habit_daily_records').delete().eq('habit_id',habitId).eq('record_date',date);if(result.error)throw fail(result.error);notify()}
export async function setHabitComplete(habitId:string,date:string,complete:boolean){return setHabitValue(habitId,date,complete?1:0)}
