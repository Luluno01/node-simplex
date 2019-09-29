# node-simplex

A step-by-step linear program simplex method solver.

Solve the LP as simple as

```TypeScript
import LinearProgram, { printSolve } from 'simplex'


const lp = LinearProgram.fromString({
  variables: 2,
  objective: '2 * x1 + 3 * x2',
  constraints: [
    'w1 = 6 - x1 - x2',
    'w2 = 10 - 2 * x1 - x2',
    'w3 = 4 + x1 - x2'
  ]
})

printSolve(lp)
```

And Bob is your uncle! Submit your assignment now!

```
Objective: 2x1 + 3x2
w1 = -x1 - x2 + 6
w2 = -2x1 - x2 + 10
w3 = x1 - x2 + 4

optimizable
Objective: 2x2 - w2 + 10
w1 = -1/2x2 + 1/2w2 + 1
x1 = -1/2x2 - 1/2w2 + 5
w3 = -3/2x2 - 1/2w2 + 9

optimizable
Objective: w2 - 4w1 + 14
x2 = w2 - 2w1 + 2
x1 = -w2 + w1 + 4
w3 = -2w2 + 3w1 + 6

optimal
Objective: -5/2w1 - 1/2w3 + 17
x2 = -1/2w1 - 1/2w3 + 5
x1 = -1/2w1 + 1/2w3 + 1
w2 = 3/2w1 - 1/2w3 + 3
```

## Usage

### Install

```bash
npm install git+https://github.com/Luluno01/node-simplex.git --save
```

### Examples

See [here](https://github.com/Luluno01/node-simplex/tree/master/src/examples).

## Development Usage

### Clone

```bash
git clone https://github.com/Luluno01/node-simplex.git node-simplex --depth=1
```

### Install Dependencies

```bash
cd node-simplex
npm install
```

### Build

```bash
npm run build
```

## Lambda Function Version

See [simplex-netlify](github.com/Luluno01/simplex-netlify).

Live demo [node-simplex.netlify.com](https://node-simplex.netlify.com/) [![Netlify Status](https://api.netlify.com/api/v1/badges/cb862792-1a20-4277-9e06-adc9008036b0/deploy-status)](https://app.netlify.com/sites/node-simplex/deploys)

## Fully Static Web Page Version

See [simple-simplex](https://github.com/Luluno01/simple-simplex).

Live demo [simplex.untitled.vip/](https://simplex.untitled.vip/) [![Netlify Status](https://api.netlify.com/api/v1/badges/23ff585e-0de6-4d26-9be2-773e37b90a2f/deploy-status)](https://app.netlify.com/sites/simple-simlex/deploys)
