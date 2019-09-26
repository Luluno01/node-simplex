import * as assert from 'assert'
import * as algebra from 'algebra.js'
import { Expression, Equation, Fraction } from 'algebra.js'
import { EventEmitter } from 'events'
import * as strategies from './strategies'


function getConstant(constants: Fraction[]) {
  return (constants.length && constants[0].valueOf()) || 0
}

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

export enum Result {
  OPTIMIZABLE = 'optimizable',
  OPTIMAL = 'optimal',
  UNBOUNDED = 'unbounded',
  INFEASIBLE = 'infeasible',
  HELP_NEEDED = 'helper-needed',
  HELPER_CREATED = 'helper-created',
  HELPER_FEASIBLE = 'helper-feasible',
  ORIGIN_FEASIBLE = 'origin-feasible'
}

function coeffOf(terms: typeof Expression.prototype.terms, variableName: string) {
  for(const { variables: [ { variable } ], coefficients: [ coeff ] } of terms) {
    if(variable == variableName) return coeff.valueOf()
  }
  return 0
}

/**
 * Human-readable representation of linear program
 * 
 * See `src/examples` for usage examples
 */
export class LinearProgram extends EventEmitter implements PlainLinearProgram {
  /**
   * The number of variables (standard)
   */
  variables: number
  /**
   * Names of non-basic variables
   */
  nonBasics: Set<string> = new Set
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
   * Names of basic variables
   */
  basics: Set<string> = new Set
  /**
   * Picking strategy
   */
  strategy?: strategies.Strategy = new strategies.CyclingAvoidance(this)

  /**
   * Name of helper variable if the parent dictionary is infeasible (thus this
   * is a helper LP/dictionary)
   */
  helper?: string

  /**
   * 
   * @param lp Linear program in standard form
   * Note that names of non-basic variables shall start from `x1` and those
   * of basic variables shall start from `w1`
   * @param deepCopy Deep copy the input `lp` (defaults to `true`)
   */
  constructor({ variables, objective, constraints }: PlainLinearProgram, deepCopy: boolean = true) {
    super()
    this.variables = variables
    assert(variables > 0, `Invalid number of variables: ${variables}`)
    for(const { variables: [ { variable } ] } of objective.terms) {
      this.nonBasics.add(variable)
    }
    for(const { lhs, rhs } of constraints) {
      assert(lhs.terms.length == 1 && rhs.terms.length <= variables, `Invalid constraint equation \`${lhs.toString()} = ${rhs.toString()}\` (acceptable example: w0 = 4 - x1 - x2))`)
      this.basics.add(lhs.terms[0].variables[0].variable)
      for(const { variables: [ { variable } ] } of rhs.terms) {
        this.nonBasics.add(variable)
      }
    }
    assert(this.nonBasics.size == variables, 'The number of non-basic variables not matches the designated number')
    if(deepCopy) {
      this.objective = objective.add(0)
      this.constraints = constraints.map(({ lhs, rhs }) => new Equation(lhs, rhs))
    } else {
      this.objective = objective
      this.constraints = constraints
    }
  }

  /**
   * Create a `LinearProgram` from strings
   * @param lp Linear program in standard form (string)
   */
  static fromString({ variables, objective, constraints }: { variables: number, objective: string, constraints: string[] }) {
    return new LinearProgram({
      variables,
      objective: <Expression>algebra.parse(objective),
      constraints: constraints.map(s => <Equation>algebra.parse(s))
    })
  }

  /**
   * Check if current dictionry (not the LP) is feasible
   */
  isFeasible() {
    return this.constraints.every(({ rhs }) => (rhs.constants.length && rhs.constants[0].valueOf() >= 0) || rhs.constants.length == 0)
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
    const { objective, constraints } = this
    for(const { variables: [ { variable: nonBasicVariableName } ], coefficients: [ coeff ] } of objective.terms) {
      if(
        /**
         * If the coefficient of the non-basic variable in the objective
         * function is positive
         */
        coeff.valueOf() > 0
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
      /* non-basic variable name */
      string,
      /* constraint */
      Equation,
      /* upper bound */
      number
    ]
    const incrementBounds: IncrementBound[] = []
    for(const nonBasicVariableName of nonBasics) {
      if(coeffOf(objective.terms, nonBasicVariableName) > 0) {
        // Optimizable
        let minIncrementBound: IncrementBound
        for(const constraint of constraints) {
          const coeff = coeffOf(constraint.rhs.terms, nonBasicVariableName)
          if(coeff < 0) {
            if(minIncrementBound == undefined) {
              minIncrementBound = [
                nonBasicVariableName,
                constraint,
                getConstant(constraint.rhs.constants) / (-coeff)
              ]
            } else {
              const bound = constraint.rhs.constants[0].valueOf() / (-coeff)
              if(bound < minIncrementBound[2]) {  // A smaller bound found
                minIncrementBound = [
                  nonBasicVariableName,
                  constraint,
                  getConstant(constraint.rhs.constants) / (-coeff)
                ]
              }
            }
          }
        }
        if(minIncrementBound) incrementBounds.push(minIncrementBound)
        else return Result.UNBOUNDED
      }
    }
    if(incrementBounds.length) return incrementBounds
    else return Result.OPTIMAL  // Coefficients of all variables are non-positive
  }

  /**
   * Get current (basic) solution
   * Caller must ensure the dictionary is feasible
   */
  getCurrentSolution() {
    return getConstant(this.objective.constants)
  }

  /**
   * Get the dual LP
   */
  getDual(): LinearProgram {
    throw new Error('Not implemented')
  }

  private doPivot(nonBasicVariableName: string, constraint: Equation) {
    const basicVariableName = constraint.lhs.terms[0].variables[0].variable
    const newConstraint = new Equation(new Expression(nonBasicVariableName), <Expression><unknown>constraint.solveFor(nonBasicVariableName))
    this.constraints = this.constraints.map(cons => {
      if(cons == constraint) {
        return newConstraint
      } else {
        const varMap: { [name: string]: Expression } = {}
        varMap[nonBasicVariableName] = newConstraint.rhs
        return new Equation(cons.lhs, cons.rhs.eval(varMap))
      }
    })
    const { nonBasics, basics } = this
    nonBasics.delete(nonBasicVariableName)
    nonBasics.add(basicVariableName)
    basics.delete(basicVariableName)
    basics.add(nonBasicVariableName)
    const varMap: { [name: string]: Expression } = {}
    varMap[nonBasicVariableName] = newConstraint.rhs
    this.objective = this.objective.eval(varMap, true)
  }

  /**
   * Do next pivot
   */
  private next() {
    if(this.isUnbounded()) return Result.UNBOUNDED  // No need to be feasible if unbounded
    if(this.isFeasible()) {
      const res = this.pickEnter()
      switch(res) {
        case Result.OPTIMAL: {
          this.emit(Result.OPTIMAL)
          return Result.OPTIMAL
        }
        case Result.UNBOUNDED: throw new Error('Unbounded dictionary detected, but the dictionary is detected as bounded previously')
        default:
      }
      if(!this.strategy) this.strategy = new strategies.CyclingAvoidance(this)
      const [ variableName, constraint ] = this.strategy.pick(res)
      // `variableName` enters, lhs of constraint leaves
      this.doPivot(variableName, constraint)
      assert(this.isFeasible())
      if(this.isOptimal()) {
        this.emit(Result.OPTIMAL)
        return Result.OPTIMAL
      }
      if(this.isUnbounded()) {
        this.emit(Result.UNBOUNDED)
        return Result.UNBOUNDED
      }
      this.emit(Result.OPTIMIZABLE)
      return Result.OPTIMIZABLE
    } else {
      // The dictionary is not feasible
      this.emit(Result.HELP_NEEDED)
      return Result.HELP_NEEDED
    }
  }

  /**
   * Solve the LP step by step
   */
  *solve(): Generator<[ LinearProgram, Result ], void> {
    let result = this.next()
    while(result == Result.OPTIMIZABLE) {
      this.emit(result)
      yield [ this, result ]
      result = this.next()
    }
    this.emit(result)
    yield [ this, result ]
    if(result != Result.HELP_NEEDED) return
    const gen = this.infeasibleHelper()
    let helperGenRes = gen.next()
    let helperLP: LinearProgram
    let helperResult: Result
    while(!helperGenRes.done) {
      const [ lp, res ] = <[ LinearProgram, Result ]>helperGenRes.value
      helperLP = lp
      helperResult = res
      this.emit(res)
      yield <[ LinearProgram, Result ]>helperGenRes.value
      helperGenRes = gen.next()
    }
    assert(helperResult == Result.OPTIMAL, `Helper LP should not end up with result ${helperResult}`)
    if(helperLP.getCurrentSolution() != 0) {
      this.emit(Result.INFEASIBLE)
      yield [ this, Result.INFEASIBLE ]
      return
    }
    // We actually found a feasible solution
    const varMap: { [name: string]: Expression } = {}
    varMap[helperLP.helper] = new Expression(0)
    this.constraints = helperLP.constraints.map(({ lhs, rhs }) => new Equation(lhs, rhs.eval(varMap)))
    delete varMap[helperLP.helper]
    for(const { lhs, rhs } of this.constraints) {
      varMap[lhs.terms[0].variables[0].variable] = rhs
    }
    this.objective = this.objective.eval(varMap)
    this.emit(Result.ORIGIN_FEASIBLE)
    yield [ this, Result.ORIGIN_FEASIBLE ]
    yield *this.solve()
  }

  /**
   * Solve the LP without stop
   */
  solveAll() {
    let res: Result
    for(const [ , result ] of this.solve()) {
      res = result
    }
    return res
  }

  private *infeasibleHelper(): Generator<[ LinearProgram, Result ], void> {
    const lp = new LinearProgram(this)
    const helper = 'helperVariable'
    const helperVar = <Expression>algebra.parse(helper)
    lp.helper = helper
    lp.variables++
    lp.objective = <Expression>algebra.parse(`- ${helper}`)
    let constraintForNextPivot: Equation
    let minConst: number = +Infinity
    lp.constraints = lp.constraints.map(constraint => {
      const constant = getConstant(constraint.rhs.constants)
      if(constant < minConst) {
        minConst = constant
        constraintForNextPivot = constraint = new Equation(constraint.lhs, constraint.rhs.add(helperVar))
        return constraint
      }
      return new Equation(constraint.lhs, constraint.rhs.add(helperVar))
    })
    yield [ lp, Result.HELPER_CREATED ]
    lp.doPivot(helper, constraintForNextPivot)
    // At this point we should have a feasible dictionary
    yield [ lp, Result.HELPER_FEASIBLE ]
    yield *lp.solve()
  }

  toString() {
    return `Objective: ${this.objective.toString()}\n${this.constraints.map(constraint => constraint.toString()).join('\n')}`
  }
}

export default LinearProgram
