import { Operator } from './constraint-utils';

export class ConstraintWrapper {
  constructor(
    readonly projectIds: string[],
    readonly constraintFunction: ConstraintFunctionWrapper,
    readonly threshold: ThresholdWrapper,
    readonly id: string,
    public isActive: boolean
  ) {}
}

export class ConstraintFunctionWrapper {
  constructor(
    readonly property: string,
    readonly propertyId: string,
    readonly operator: Operator,
    readonly value: string,
    readonly valueId: string,
    readonly studentIds: string[],
    readonly description: string
  ) {}
}

export class ThresholdWrapper {
  constructor(
    readonly lowerBound: number,
    readonly upperBound: number
  ) {}
}
