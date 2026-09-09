import type{CaffeineIntake}from'./types'
export const ESPRESSO_SHOT_MG=63.6,DEFAULT_DURATION_MINUTES=60,DEFAULT_HALF_LIFE_HOURS=5,EFFECT_REFERENCE_MG=40
export function intakeLoadAt(intake:CaffeineIntake,time:Date,halfLifeHours=DEFAULT_HALF_LIFE_HOURS){const elapsed=(time.getTime()-new Date(intake.startedAt).getTime())/3600000;if(elapsed<=0)return 0;const duration=intake.durationMinutes/60,k=Math.log(2)/halfLifeHours,rate=intake.caffeineMg/duration;if(elapsed<duration)return rate/k*(1-Math.exp(-k*elapsed));const atFinish=rate/k*(1-Math.exp(-k*duration));return atFinish*Math.exp(-k*(elapsed-duration))}
export function totalLoadAt(intakes:CaffeineIntake[],time:Date,halfLifeHours=DEFAULT_HALF_LIFE_HOURS){return intakes.reduce((sum,intake)=>sum+intakeLoadAt(intake,time,halfLifeHours),0)}
