import { ConstraintFunction, PropertySelectGroup, SelectData } from './constraint-function';
import { Operator } from '../constraint-utils';
import { Student, Skill } from 'src/app/api/models';

export class TeamSizeConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Team Size', [Operator.EQUALS]);
  }

  override filterStudentsByConstraintFunction(): Student[] {
    return this.students;
  }

  override getProperties(): PropertySelectGroup {
    return { name: 'Team Size', constraintFunction: this, values: [{ id: 'cf-team-size', name: 'Team Size' }] };
  }

  override getValues(): SelectData[] {
    return [{ id: 'cf-team-size-default-value', name: 'true' }];
  }

  override getDescription(): string {
    return `Team Size`;
  }
}
