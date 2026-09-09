export type CaffeineIntake={id:string;source:string;caffeineMg:number;startedAt:string;durationMinutes:number;note:string|null}
export type CaffeineIntakeInput=Omit<CaffeineIntake,'id'>
