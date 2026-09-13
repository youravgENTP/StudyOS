export type CaffeineIntake={id:string;source:string;caffeineMg:number;startedAt:string;durationMinutes:number;note:string|null}
export type CaffeineIntakeInput=Omit<CaffeineIntake,'id'>
export type CaffeinePreset={id:string;name:string;caffeineMg:number;kind:'drink'|'tablet';durationMinutes:number;color:string;builtIn?:boolean;recordId?:string;builtInKey?:string|null;hidden?:boolean}
export type CaffeinePresetInput=Pick<CaffeinePreset,'name'|'caffeineMg'|'kind'|'durationMinutes'|'color'>
