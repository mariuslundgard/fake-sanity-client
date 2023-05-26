/* eslint-disable no-use-before-define */

import type {IndentifierToken, NumberToken, QuotedToken, SymbolToken, Token} from './types'

type TokenizerFn = () => Token | null

const RE_DIGIT_CHAR = /[0-9]/
const RE_ATTR_CHAR = /^[a-zA-Z0-9_]$/
const RE_ATTR_FIRST_CHAR = /^[a-zA-Z_]$/

const SYMBOLS: Record<string, string[]> = {
  operator: ['..', '.', ',', ':', '?'],
  comparator: ['>', '>=', '<', '<=', '==', '!='],
  keyword: ['$', '@'],
  boolean: ['true', 'false'],
  paren: ['[', ']'],
}

/**
 * Tokenize a jsonpath2 expression
 * @todo Support '*'
 */
export function tokenize(jsonpath: string): Token[] {
  return new Tokenizer(jsonpath).tokenize()
}

class Tokenizer {
  source: string
  i: number
  start?: number
  length: number
  tokenizers: TokenizerFn[]

  constructor(path: string) {
    this.source = path
    this.length = path.length
    this.i = 0

    this.tokenizers = [
      this.tokenizeSymbol,
      this.tokenizeIdentifier,
      this.tokenizeNumber,
      this.tokenizeQuoted,
    ].map((fn) => fn.bind(this))
  }

  tokenize(): Token[] {
    const result: Token[] = []

    while (!this.EOF()) {
      let token: Token | null = null

      this.chompWhitespace()

      const found = this.tokenizers.find((tokenizer) => {
        token = tokenizer()

        return !!token
      })

      if (!found || !token) {
        throw new Error(`Invalid tokens in jsonpath '${this.source}' @ ${this.i}`)
      }

      result.push(token)
    }

    return result
  }

  takeWhile(fn: (character: string) => string | null): string | null {
    const start = this.i
    let result = ''

    while (!this.EOF()) {
      const nextChar = fn(this.source[this.i])

      if (nextChar === null) {
        break
      }

      result += nextChar
      this.i++
    }

    if (this.i === start) {
      return null
    }

    return result
  }

  EOF(): boolean {
    return this.i >= this.length
  }

  peek(): string | null {
    if (this.EOF()) {
      return null
    }

    return this.source[this.i]
  }

  consume(str: string) {
    if (this.i + str.length > this.length) {
      throw new Error(`Expected ${str} at end of jsonpath`)
    }

    if (str == this.source.slice(this.i, this.i + str.length)) {
      this.i += str.length
    } else {
      throw new Error(`Expected "${str}", but source contained "${this.source.slice(this.start)}`)
    }
  }

  // Tries to match the upcoming bit of string with the provided string. If it matches, returns
  // the string, then advances the read pointer to the next bit. If not, returns null and nothing
  // happens.
  tryConsume(str: string) {
    if (this.i + str.length > this.length) {
      return null
    }

    if (str == this.source.slice(this.i, this.i + str.length)) {
      this.i += str.length

      return str
    }

    return null
  }

  chompWhitespace() {
    this.takeWhile((char) => {
      return char == ' ' ? '' : null
    })
  }

  tokenizeQuoted(): QuotedToken | null {
    const quote = this.peek()

    if (quote == "'" || quote == '"') {
      this.consume(quote)

      let escape = false

      const inner = this.takeWhile((char) => {
        if (escape) {
          escape = false

          return char
        }

        if (char == '\\') {
          escape = true

          return ''
        }

        if (char != quote) {
          return char
        }

        return null
      })

      this.consume(quote)

      return {
        type: 'quoted',
        value: inner,
        quote: quote == '"' ? 'double' : 'single',
      }
    }

    return null
  }

  tokenizeIdentifier(): IndentifierToken | null {
    let first = true
    const identifier = this.takeWhile((char) => {
      if (first) {
        first = false

        return char.match(RE_ATTR_FIRST_CHAR) ? char : null
      }

      return char.match(RE_ATTR_CHAR) ? char : null
    })

    if (identifier !== null) {
      return {
        type: 'identifier',
        name: identifier,
      }
    }

    return null
  }

  tokenizeNumber(): NumberToken | null {
    const start = this.i
    let dotSeen = false
    let digitSeen = false
    let negative = false

    if (this.peek() == '-') {
      negative = true
      this.consume('-')
    }

    const number = this.takeWhile((char) => {
      if (char == '.' && !dotSeen && digitSeen) {
        dotSeen = true

        return char
      }

      digitSeen = true

      return char.match(RE_DIGIT_CHAR) ? char : null
    })

    if (number !== null) {
      return {
        type: 'number',
        value: negative ? -number : +number,
        raw: negative ? `-${number}` : number,
      }
    }

    // No number, rewind
    this.i = start

    return null
  }

  tokenizeSymbol(): SymbolToken | null {
    let result: SymbolToken | null = null

    Object.keys(SYMBOLS).find((symbolClass) => {
      const patterns = SYMBOLS[symbolClass]
      const found = patterns.find((pattern) => this.tryConsume(pattern))

      if (found) {
        result = {
          type: symbolClass,
          symbol: found,
        } as SymbolToken

        return true
      }

      return false
    })

    return result
  }
}
