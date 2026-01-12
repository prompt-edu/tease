import { Skill, Student } from 'src/app/api/models';
import { Operator, OperatorMapping } from '../constraint-utils';
import { ChartDataFormatter } from 'src/app/components/statistics/charts/chart-data-formatter/chart-data-formatter';

export interface ConstraintFunctionValues {
  property: SelectData;
  name: string;
  operators: SelectData[];
  values: SelectData[];
  constraintFunction: ConstraintFunction;
}

export interface SelectData {
  name: string; //shown in the dropdown
  id: string; //value to be used in constraint
  group?: string; //grouping for the dropdown
  reference?: ChartDataFormatter; //reference to the object
  selected?: boolean; //if the element is selected
}

export interface PropertySelectGroup {
  name: string; //shown in the dropdown
  values: SelectData[];
  constraintFunction: ConstraintFunction;
}

export abstract class ConstraintFunction {
  constructor(
    protected readonly students: Student[],
    protected readonly skills: Skill[],
    protected readonly constraintFunctionType: string,
    protected operators: Operator[] = Object.values(Operator)
  ) {}

  abstract filterStudentsByConstraintFunction(property: string, operator: Operator, value: string): Student[];

  abstract getProperties(): PropertySelectGroup;

  abstract getValues(): SelectData[];

  getDescription(property: string, operator: Operator, value: string): string {
    return `${property} ${OperatorMapping[operator]} ${value}`;
  }

  getOperators(): SelectData[] {
    return this.operators.map(operator => ({
      id: operator,
      name: OperatorMapping[operator],
    }));
  }

  getConstraintFunctionFormData(): ConstraintFunctionValues[] {
    return this.getProperties().values.map(value => {
      return {
        property: { id: value.id, name: value.name },
        operators: this.getOperators(),
        values: this.getValues(),
        name: this.constraintFunctionType,
        constraintFunction: this,
      };
    });
  }
}
