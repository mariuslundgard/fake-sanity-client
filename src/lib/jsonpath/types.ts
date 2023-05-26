/* eslint-disable no-use-before-define */

export interface Probe {
  path: Array<string | number>
  containerType(): 'array' | 'object' | 'primitive'
  length(): number
  getIndex(index: number): Probe | null | false
  get: () => unknown
  getAttribute(string: string): Probe | null
  attributeKeys(): string[]
  hasAttribute(attr: string): boolean
}

export interface AliasExpr {
  expr?: Expr
  type: 'alias'
  target: 'self'
}

export interface AttributeExpr {
  expr?: Expr
  type: 'attribute'
  name: string
}

export interface BooleanExpr {
  type: 'boolean'
  value: boolean
}

export interface ConstraintExpr {
  expr?: Expr
  type: 'constraint'
  operator: '?' | '>' | '>=' | '<' | '<=' | '==' | '!='
  lhs: Expr
  rhs: Expr
}

export interface IndexExpr {
  expr?: Expr
  type: 'index'
  value: number
}

export interface NumberExpr {
  expr?: Expr
  type: 'number'
  value: number
}

export interface PathExpr {
  expr?: Expr
  type: 'path'
  nodes: Expr[]
}

export interface RangeExpr {
  expr?: Expr
  type: 'range'
  start: number
  end: number
  step: number | null
}

export interface RecursiveExpr {
  expr?: Expr
  type: 'recursive'
  term: Expr
}

export interface StringExpr {
  expr?: Expr
  type: 'string'
  value: string
}

export interface UnionExpr {
  expr?: Expr
  type: 'union'
  nodes: Expr[]
}

export type Expr =
  | AliasExpr
  | AttributeExpr
  | ConstraintExpr
  | IndexExpr
  | NumberExpr
  | PathExpr
  | RangeExpr
  | RecursiveExpr
  | StringExpr
  | UnionExpr

export interface IndentifierToken {
  type: 'identifier'
  name: string
}

export interface NumberToken {
  type: 'number'
  value: number
  raw: string
}

export interface QuotedToken {
  type: 'quoted'
  value: string | null
  quote: 'double' | 'single'
}

export interface SymbolOperatorToken {
  type: 'operator'
  symbol: '..' | '.' | ' |' | ':' | '?'
}
export interface SymbolComparatorToken {
  type: 'comparator'
  symbol: '>' | '>=' | '<' | '<=' | '==' | '!='
}
export interface SymbolKeywordToken {
  type: 'keyword'
  symbol: '$' | '@'
}
export interface SymbolBooleanToken {
  type: 'boolean'
  symbol: 'true' | 'false'
}
export interface SymbolParenToken {
  type: 'paren'
  symbol: '[' | ']'
}

export type SymbolToken =
  | SymbolOperatorToken
  | SymbolComparatorToken
  | SymbolKeywordToken
  | SymbolBooleanToken
  | SymbolParenToken

export type Token = IndentifierToken | NumberToken | QuotedToken | SymbolToken
