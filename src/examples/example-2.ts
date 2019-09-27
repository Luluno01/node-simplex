import * as algebra from 'algebra.js'
import { Expression, Equation } from 'algebra.js'
import LinearProgram from '../LinearProgram'
import printSolve from '../printSolve'


const lp = new LinearProgram({
  variables: 2,
  objective: <Expression>algebra.parse('80000 - x1 + 4 * x2'),
  constraints: [
    <Equation>algebra.parse('w1 = -2 * x1 + x2'),
    <Equation>algebra.parse('w2 = x1 - x2')
  ]
})

printSolve(lp)
