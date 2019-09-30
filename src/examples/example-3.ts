import * as algebra from 'algebra.js'
import { Expression, Equation } from 'algebra.js'
import LinearProgram from '../LinearProgram'
import printSolve from '../printSolve'


const lp = new LinearProgram({
  variables: 3,
  objective: <Expression>algebra.parse('- x1 + 2 * x2 - 4 * x3'),
  constraints: [
    <Equation>algebra.parse('w1 = -5 + x1 + 5 * x2 + 3 * x3'),
    <Equation>algebra.parse('w2 = 4 - 2 * x1 + x2 - 2 * x3'),
    <Equation>algebra.parse('w3 = -2 + x1 + 2 * x2 - x3'),
    <Equation>algebra.parse('w3 = 2 - x1 - 2 * x2 + x3')
  ]
})

printSolve(lp)
