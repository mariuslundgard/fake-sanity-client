/* eslint-disable no-use-before-define */

import {tokenize} from './tokenize'
import type {
  AliasExpr,
  AttributeExpr,
  BooleanExpr,
  ConstraintExpr,
  Expr,
  IndentifierToken,
  IndexExpr,
  NumberExpr,
  NumberToken,
  PathExpr,
  QuotedToken,
  RangeExpr,
  RecursiveExpr,
  StringExpr,
  SymbolBooleanToken,
  SymbolComparatorToken,
  Token,
  UnionExpr,
} from './types'

/**
 * Converts a string into an abstract syntax tree representation
 * @todo Support '*'
 */
export function parse(path: string): PathExpr | null {
  return new Parser(path).parse()
}

class Parser {
  tokens: Token[]
  length: number
  i: number

  constructor(path: string) {
    this.tokens = tokenize(path)
    this.length = this.tokens.length
    this.i = 0
  }

  parse() {
    return this.parsePath()
  }

  EOF() {
    return this.i >= this.length
  }

  // Look at upcoming token
  peek() {
    if (this.EOF()) {
      return null
    }

    return this.tokens[this.i]
  }

  consume() {
    const result = this.peek()

    this.i += 1

    return result
  }

  // Return next token if it matches the pattern
  probe(pattern: Record<string, unknown>): Token | null {
    const token = this.peek()

    if (!token) {
      return null
    }

    // Make TypeScript happy
    const t = token as unknown as Record<string, unknown>

    const mismatch = Object.keys(pattern).find((key) => {
      const value = pattern[key]

      if (!t[key] || t[key] !== value) {
        return true
      }

      return false
    })

    if (mismatch) {
      return null
    }

    return token
  }

  // Return and consume next token if it matches the pattern
  match(pattern: Record<string, unknown>): Token | null {
    if (this.probe(pattern)) {
      return this.consume()
    }

    return null
  }

  parseAttribute(): AttributeExpr | null {
    const token = this.match({type: 'identifier'}) as IndentifierToken | null

    if (token) {
      return {
        type: 'attribute',
        name: token.name,
      } as AttributeExpr
    }

    const quoted = this.match({type: 'quoted', quote: 'single'}) as QuotedToken | null

    if (quoted) {
      return {
        type: 'attribute',
        name: quoted.value,
      } as AttributeExpr
    }

    return null
  }

  parseAlias(): AliasExpr | null {
    if (this.match({type: 'keyword', symbol: '@'}) || this.match({type: 'keyword', symbol: '$'})) {
      return {
        type: 'alias',
        target: 'self',
      } as AliasExpr
    }

    return null
  }

  parseNumber(): NumberExpr | null {
    const token = this.match({type: 'number'}) as NumberToken | null

    if (token) {
      return {
        type: 'number',
        value: token.value,
      } as NumberExpr
    }

    return null
  }

  parseNumberValue(): number | null {
    const expr = this.parseNumber() as NumberExpr | null

    if (expr) {
      return expr.value
    }

    return null
  }

  parseSliceSelector() {
    const currentIndex = this.i
    const start = this.parseNumberValue()

    let end: number | null = null
    let step: number | null = null

    const colon1 = this.match({type: 'operator', symbol: ':'})

    if (colon1) {
      end = this.parseNumberValue()

      const colon2 = this.match({type: 'operator', symbol: ':'})

      if (colon2) {
        step = this.parseNumberValue()
      }
    } else {
      if (start !== null) {
        // Unwrap, this was just a single index not followed by colon
        return {type: 'index', value: start} as IndexExpr
      }

      // Rewind – this was actually nothing
      this.i = currentIndex

      return null
    }

    if (start !== null && end !== null) {
      return {
        type: 'range',
        start,
        end,
        step,
      } as RangeExpr
    }

    // Rewind – this wasn't a slice selector
    this.i = currentIndex

    return null
  }

  parseValueReference() {
    return this.parseAttribute() || this.parseSliceSelector()
  }

  parseLiteralValue(): StringExpr | BooleanExpr | NumberExpr | null {
    const literalString = this.match({type: 'quoted', quote: 'double'}) as QuotedToken | null

    if (literalString) {
      return {
        type: 'string',
        value: literalString.value,
      } as StringExpr
    }

    const literalBoolean = this.match({type: 'boolean'}) as SymbolBooleanToken

    if (literalBoolean) {
      return {
        type: 'boolean',
        value: literalBoolean.symbol == 'true',
      } as BooleanExpr
    }

    return this.parseNumber()
  }

  // TODO: Reorder constraints so that literal value is always on rhs, and variable is always
  // on lhs.
  parseFilterExpression(): ConstraintExpr | null {
    const start = this.i
    const expr = this.parseAttribute() || this.parseAlias()

    if (!expr) {
      return null
    }

    if (this.match({type: 'operator', symbol: '?'})) {
      return {
        type: 'constraint',
        operator: '?',
        lhs: expr,
      } as ConstraintExpr
    }

    const binOp = this.match({type: 'comparator'}) as SymbolComparatorToken | null

    if (!binOp) {
      // No expression, rewind!
      this.i = start

      return null
    }

    const lhs = expr
    const rhs = this.parseLiteralValue()

    if (!rhs) {
      throw new Error(`Operator ${binOp.symbol} needs a literal value at the right hand side`)
    }

    return {
      type: 'constraint',
      operator: binOp.symbol,
      lhs: lhs,
      rhs: rhs,
    } as ConstraintExpr
  }

  parseExpression() {
    return this.parseFilterExpression() || this.parseValueReference()
  }

  parseUnion() {
    if (!this.match({type: 'paren', symbol: '['})) {
      return null
    }

    const terms: Expr[] = []
    let expr = this.parseFilterExpression() || this.parsePath() || this.parseValueReference()

    while (expr) {
      terms.push(expr)

      // End of union?
      if (this.match({type: 'paren', symbol: ']'})) {
        break
      }

      if (!this.match({type: 'operator', symbol: ','})) {
        throw new Error('Expected ]')
      }

      expr = this.parseFilterExpression() || this.parsePath() || this.parseValueReference()

      if (!expr) {
        throw new Error("Expected expression following ','")
      }
    }

    return {
      type: 'union',
      nodes: terms,
    } as UnionExpr
  }

  parseRecursive(): RecursiveExpr | null {
    if (this.match({type: 'operator', symbol: '..'})) {
      const subpath = this.parsePath()

      if (!subpath) {
        throw new Error("Expected path following '..' operator")
      }

      return {
        type: 'recursive',
        term: subpath,
      } as RecursiveExpr
    }

    return null
  }

  parsePath(): PathExpr | null {
    const nodes: Expr[] = []
    const expr = this.parseAttribute() || this.parseUnion() || this.parseRecursive()

    if (!expr) {
      return null
    }

    nodes.push(expr)

    while (!this.EOF()) {
      if (this.match({type: 'operator', symbol: '.'})) {
        const attr = this.parseAttribute()

        if (!attr) {
          throw new Error("Expected attribute name following '.")
        }

        nodes.push(attr)
        continue
      } else if (this.probe({type: 'paren', symbol: '['})) {
        const union = this.parseUnion()

        if (!union) {
          throw new Error("Expected union following '['")
        }

        nodes.push(union)
      } else {
        const recursive = this.parseRecursive()

        if (recursive) {
          nodes.push(recursive)
        }

        break
      }
    }

    // if (nodes.length === 1) {
    //   return nodes[0] as PathExpr
    // }

    return {
      type: 'path',
      nodes: nodes,
    } as PathExpr
  }
}
