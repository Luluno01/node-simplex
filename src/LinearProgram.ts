import * as assert from 'assert'
import * as algebra from 'algebra.js'
import { Expression, Equation } from 'algebra.js'


export interface PlainLinearProgram {
  /**
   * The number of variables (standard)
   */
  variables: number
  /**
   * Objective function to maximize
   * 
   * c0 + c1 * x1 + c2 * x2 + c3 * x3 + ... + cn * xn
   */
  objective: Expression
  /**
   * Constraints represented by basic and non-basic variables
   * 
   * w1 = b1 + a11 * x1 + a12 * x2 + a3 * x3 + ... + a1n * xn
   * ...
   */
  constraints: Equation[]
}

enum Result {
  OPTIMIZABLE,
  OPTIMAL,
  UNBOUNDED,
  INFEASIBLE
}

function coeffOf(terms: typeof Expression.prototype.terms, variableName: string) {
  for(const { variables: [ { variable } ], coefficients: [ coeff ] } of terms) {
    if(variable == variableName) return coeff.valueOf()
  }
  return 0
}

export class LinearProgram implements PlainLinearProgram {
  /**
   * The number of variables (standard)
   */
  variables: number
  /**
   * Ordered names of non-basic variables
   */
  nonBasics: string[] = []
  /**
   * Objective function to maximize
   * 
   * c0 + c1 * x1 + c2 * x2 + c3 * x3 + ... + cn * xn
   */
  objective: Expression
  /**
   * Constraints represented by basic and non-basic variables
   * 
   * w1 = b1 + a11 * x1 + a12 * x2 + a3 * x3 + ... + a1n * xn
   * ...
   */
  constraints: Equation[]
  /**
   * Ordered names of basic variables
   */
  basics: string[] = []

  /**
   * 
   * @param lp Linear program in standard form
   * Note that names of non-basic variables shall start from `x1` and those
   * of basic variables shall start from `w1`
   * @param deepCopy Deep copy the input `lp` (defaults to `true`)
   */
  constructor({ variables, objective, constraints }: PlainLinearProgram, deepCopy: boolean = true) {
    this.variables = variables
    assert(variables > 0, `Invalid number of variables: ${variables}`)
    for(let i = 1; i <= variables; i++) {
      this.nonBasics.push(`x${i}`)
    }
    assert(objective.terms.length == variables, `Mismatched objective function, expected objective function of ${variables} variables`)
    assert(constraints.every(({ lhs, rhs }) => lhs.terms.length == 1 && rhs.terms.length <= variables), 'Invalid constraint equation (acceptable example: w0 = 4 - x1 - x2))')
    const constraintsNum = constraints.length
    for(let i = 1; i <= constraintsNum; i++) {
      this.basics.push(`w${i}`)
    }
    if(deepCopy) {
      this.objective = objective.add(0)
      this.constraints = constraints.map(({ lhs, rhs }) => new Equation(lhs, rhs))
    } else {
      this.objective = objective
      this.constraints = constraints
    }
  }

  static create() {

  }

  /**
   * Check if current dictionry (not the LP) is feasible
   */
  isFeasible() {
    return this.constraints.every(({ rhs }) => rhs.constants[0].valueOf() >= 0)
  }

  /**
   * If the **feasible** dictionary is optimal
   */
  isOptimal() {
    return this.objective.terms.every(({ coefficients: [ coeff ] }) => coeff.valueOf() <= 0)
  }

  /**
   * If the **feasible** dictionary is unbounded
   */
  isUnbounded() {
    const { objective, constraints, nonBasics } = this
    for(const nonBasicVariableName of nonBasics) {
      if(
        /**
         * If the coefficient of the non-basic variable in the objective
         * function is positive
         */
        coeffOf(objective.terms, nonBasicVariableName) > 0
        /**
         * And all the coefficients of the same variable in the constraints
         * are non-negative
         */
        && constraints.every(constraint => coeffOf(constraint.rhs.terms, nonBasicVariableName) >= 0)
      ) {
        /**
         * Then this dictionary is definitely unbounded
         */
        return true
      }
    }
    return false
  }

  private pickEnter() {
    // Feasible
    const { objective, constraints, nonBasics } = this
    type IncrementBound = [
      /* non-basic variable index */
      number,
      /* constraint index */
      number,
      /* upper bound */
      number
    ]
    const incrementBounds: IncrementBound[] = []
    let variableIndex = 0
    for(const nonBasicVariableName of nonBasics) {
      if(coeffOf(objective.terms, nonBasicVariableName) > 0) {
        // Optimizable
        let minIncrementBound: IncrementBound
        let constraintIndex = 0
        for(const constraint of constraints) {
          const coeff = coeffOf(constraint.rhs.terms, nonBasicVariableName)
          if(coeff < 0) {
            if(minIncrementBound == undefined) {
              minIncrementBound = [
                variableIndex,
                constraintIndex,
                constraint.rhs.constants[0].valueOf() / (-coeff)
              ]
            } else {
              const bound = constraint.rhs.constants[0].valueOf() / (-coeff)
              if(bound < minIncrementBound[2]) {  // A smaller bound found
                minIncrementBound = [
                  variableIndex,
                  constraintIndex,
                  constraint.rhs.constants[0].valueOf() / (-coeff)
                ]
              }
            }
          }
          constraintIndex++
        }
        if(minIncrementBound) incrementBounds.push(minIncrementBound)
        else return Result.UNBOUNDED
      }
      variableIndex++
    }
    if(incrementBounds.length) return incrementBounds
    else return Result.OPTIMAL  // Coefficients of all variables are non-positive
  }

  /**
   * Get the dual LP
   */
  getDual(): LinearProgram {
    throw new Error('Not implemented')
  }

  private enterAndLeave(nonBasicVariableIndex: number, basicVariableName: string) {
    const { nonBasics, basics } = this
    const nonBasicVariableName = nonBasics[nonBasicVariableIndex]
    const basicVariableIndex = basics.indexOf(basicVariableName)
    nonBasics[nonBasicVariableIndex] = basicVariableName
    basics[basicVariableIndex] = nonBasicVariableName
  }

  next() {
    const notImplemented = new Error('Not implemented')
    if(this.isUnbounded()) return Result.UNBOUNDED  // No need to be feasible if unbounded
    if(this.isFeasible()) {
      const res = this.pickEnter()
      switch(res) {
        case Result.OPTIMAL: return Result.OPTIMAL
        case Result.UNBOUNDED: throw new Error('Unbounded dictionary detected, but the dictionary is detected as bounded previously')
        default:
      }
      const [ variableIndex, constraintIndex ] = res[0]  // TODO: implement some picking strategy
      const variableName = this.nonBasics[variableIndex]
      const constraint = this.constraints[constraintIndex]
      // `variableName` enters, lhs of constraint leaves
      const newConstraint = new Equation(new Expression(variableName), <Expression><unknown>constraint.solveFor(variableName))
      this.constraints.forEach((constraint, i) => {
        if(i == constraintIndex) {
          this.constraints[constraintIndex] = newConstraint
        } else {
          const varMap: { [name: string]: Expression } = {}
          varMap[variableName] = newConstraint.rhs
          this.constraints[i] = new Equation(constraint.lhs, constraint.rhs.eval(varMap))
        }
      })
      this.enterAndLeave(variableIndex, constraint.lhs.terms[0].variables[0].variable)
      const varMap: { [name: string]: Expression } = {}
      varMap[variableName] = newConstraint.rhs
      this.objective = this.objective.eval(varMap, true)
      assert(this.isFeasible())
      if(this.isOptimal()) return Result.OPTIMAL
      if(this.isUnbounded()) return Result.UNBOUNDED
      return Result.OPTIMIZABLE
    } else throw notImplemented
  }
}

export default LinearProgram
