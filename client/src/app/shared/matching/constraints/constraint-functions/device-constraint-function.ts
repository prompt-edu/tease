import { ConstraintFunction, SelectData, PropertySelectGroup } from './constraint-function';
import { Device, Skill, Student } from 'src/app/api/models';
import { Operator } from '../constraint-utils';

export class DeviceConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Device', [Operator.EQUALS]);
  }

  override filterStudentsByConstraintFunction(property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(student => student.devices.includes(value as Device));
  }

  override getProperties(): PropertySelectGroup {
    return { name: 'Device', constraintFunction: this, values: [{ id: 'cf-device', name: 'Device' }] };
  }

  override getValues(): SelectData[] {
    return Object.values(Device).map(device => ({
      id: device,
      name: device,
    }));
  }
}
