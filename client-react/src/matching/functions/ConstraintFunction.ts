import { Student, Skill, Operator } from '../../types'
import { OperatorMapping } from '../../lib/utils'

export interface SelectData {
  id: string
  name: string
  group?: string
}

export interface PropertySelectGroup {
  name: string
  values: SelectData[]
  constraintFunction: ConstraintFunction
}

export interface ConstraintFunctionValues {
  property: SelectData
  name: string
  operators: SelectData[]
  values: SelectData[]
  constraintFunction: ConstraintFunction
}

export abstract class ConstraintFunction {
  constructor(
    protected readonly students: Student[],
    protected readonly skills: Skill[],
    protected readonly constraintFunctionType: string,
    protected readonly operators: Operator[] = Object.values(Operator),
  ) {}

  abstract filterStudentsByConstraintFunction(
    property: string,
    operator: Operator,
    value: string,
  ): Student[]

  abstract getProperties(): PropertySelectGroup

  abstract getValues(): SelectData[]

  getDescription(property: string, operator: Operator, value: string): string {
    return `${property} ${OperatorMapping[operator]} ${value}`
  }

  getOperators(): SelectData[] {
    return this.operators.map(op => ({ id: op, name: OperatorMapping[op] }))
  }

  getConstraintFunctionFormData(): ConstraintFunctionValues[] {
    return this.getProperties().values.map(val => ({
      property: { id: val.id, name: val.name },
      operators: this.getOperators(),
      values: this.getValues(),
      name: this.constraintFunctionType,
      constraintFunction: this,
    }))
  }
}
