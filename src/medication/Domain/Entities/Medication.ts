
export class MedicationSchedule {
  constructor(
    public id: string,
    public medicationId: string,
    public time: string,
    public daysOfWeek: number[],
    public enabled: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}
}

export class Medication {
  constructor(
    public id: string,
    public patientId: string,
    public caregiverId: string,
    public name: string,
    public dosage: string,
    public instructions: string | null,
    public startDate: Date,
    public endDate: Date | null,
    public active: boolean,
    public schedules: MedicationSchedule[],
    public createdAt: Date,
    public updatedAt: Date
  ) {}
}