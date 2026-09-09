export function isoDate(date: Date) {
  return date.toLocaleDateString('en-CA')
}

export function mondayIndex(date: Date) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export function startOfWeek(date: Date) {
  const start = new Date(date)

  start.setHours(0, 0, 0, 0)
  start.setDate(
    start.getDate() - mondayIndex(start),
  )

  return start
}

export function addDays(
  date: Date,
  amount: number,
) {
  const next = new Date(date)

  next.setDate(
    next.getDate() + amount,
  )

  return next
}

export function sameDate(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function startOfCalendarMonth(date:Date){const first=new Date(date.getFullYear(),date.getMonth(),1);first.setDate(first.getDate()-first.getDay());return first}

export function addMonths(date:Date,amount:number){return new Date(date.getFullYear(),date.getMonth()+amount,1)}

export type WeekStart=0|1

export function startOfWeekOn(date:Date,weekStartsOn:WeekStart){const start=new Date(date);start.setHours(0,0,0,0);const offset=(start.getDay()-weekStartsOn+7)%7;start.setDate(start.getDate()-offset);return start}

export function formatCalendarRange(start:Date,end:Date){const startYear=start.getFullYear(),endYear=end.getFullYear(),startMonth=start.getMonth()+1,endMonth=end.getMonth()+1;if(startYear===endYear&&startMonth===endMonth)return`${startYear}년 ${startMonth}월`;if(startYear===endYear)return`${startYear}년 ${startMonth}월 – ${endMonth}월`;return`${startYear}년 ${startMonth}월 – ${endYear}년 ${endMonth}월`}
