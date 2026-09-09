export type CaffeineIntake={id:string;source:string;caffeineMg:number;startedAt:string;durationMinutes:number;note:string|null}
export type CaffeineIntakeInput=Omit<CaffeineIntake,'id'>
export type CaffeinePreset={id:string;name:string;caffeineMg:number;kind:'drink'|'tablet';durationMinutes:number;color:string;builtIn?:boolean}
export type CaffeinePresetInput=Omit<CaffeinePreset,'id'|'builtIn'>
