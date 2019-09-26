import * as algebra from 'algebra.js'
import { Expression, Equation } from 'algebra.js'
import LinearProgram from '../LinearProgram'
import printSolve from './printSolve'


const lp = new LinearProgram({
  variables: 2,
  objective: <Expression>algebra.parse('-3 * x1 + 4 * x2'),
  constraints: [
    <Equation>algebra.parse('w1 = -8 + 4 * x1 + 2 * x2'),
    <Equation>algebra.parse('w2 = -2 + 2 * x1'),
    <Equation>algebra.parse('w3 = 10 - 3 * x1 - 2 * x2'),
    <Equation>algebra.parse('w4 = 1 + x1 - 3 * x2'),
    <Equation>algebra.parse('w5 = -2 + 3 * x2')
  ]
})

printSolve(lp)
