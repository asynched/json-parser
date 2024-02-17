type Token = {
  value: string
  start: number
  end: number
}

export class ParserError extends Error {}

const RE_ALPHA = /[a-zA-Z]/
const RE_ALPHANUM = /[a-zA-Z0-9]/
const RE_WHITESPACE = /\s/
const RE_DIGIT = /[0-9]/

type Parser = (parser: Honeycomb) => Token

type OneOfParsers = Record<string, Parser>

export class Honeycomb {
  private index = 0

  constructor(private readonly code: string) {}

  getIndex() {
    return this.index
  }

  alpha0(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_ALPHA)) {
        this.index++
      } else {
        break
      }
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  alpha1(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_ALPHA)) {
        this.index++
      } else {
        break
      }
    }

    const value = this.code.slice(start, this.index)

    if (value.length === 0) {
      throw new ParserError('Expected alpha')
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  alphanumeric0(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_ALPHANUM)) {
        this.index++
      } else {
        break
      }
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  alphanumeric1(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_ALPHANUM)) {
        this.index++
      } else {
        break
      }
    }

    const value = this.code.slice(start, this.index)

    if (value.length === 0) {
      throw new ParserError('Expected alphanumeric')
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  char(char: string): Token {
    if (this.code[this.index] !== char) {
      throw new ParserError(
        `Expected character to match '${char}' but received ${
          this.code[this.index]
        }`
      )
    }

    this.index++

    return {
      value: char,
      start: this.index,
      end: this.index,
    }
  }

  literal(literal: string): Token {
    if (this.code.slice(this.index, this.index + literal.length) !== literal) {
      throw new ParserError(`Expected ${literal}`)
    }

    const start = this.index

    this.index += literal.length

    return {
      value: literal,
      start,
      end: this.index,
    }
  }

  skipWhitespace() {
    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_WHITESPACE)) {
        this.index++
      } else {
        break
      }
    }
  }

  digit0(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_DIGIT)) {
        this.index++
      } else {
        break
      }
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  digit1(): Token {
    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_DIGIT)) {
        this.index++
      } else {
        break
      }
    }

    const value = this.code.slice(start, this.index)

    if (value.length === 0) {
      throw new ParserError('Expected digit')
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  clrf(): Token {
    if (this.code.slice(this.index, this.index + 2) !== '\r\n') {
      throw new ParserError('Expected CRLF')
    }

    this.index += 2

    return {
      value: '\r\n',
      start: this.index,
      end: this.index,
    }
  }

  lineEnding(): Token {
    if (this.code[this.index] === '\n') {
      const start = this.index
      this.index++

      return {
        value: '',
        start,
        end: this.index,
      }
    }

    if (this.code.slice(this.index, this.index + 2) === '\r\n') {
      this.index += 2

      return {
        value: '\r\n',
        start: this.index,
        end: this.index,
      }
    }

    throw new ParserError('Expected line ending')
  }

  multispace0(): Token {
    const RE_MULTISPACE = /\s|\t|\n|\r\n/

    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_MULTISPACE)) {
        this.index++
      } else {
        break
      }
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  multispace1(): Token {
    const RE_MULTISPACE = /\s|\t|\n|\r\n/

    const start = this.index

    while (this.index < this.code.length) {
      const char = this.code[this.index]
      if (char.match(RE_MULTISPACE)) {
        this.index++
      } else {
        break
      }
    }

    const value = this.code.slice(start, this.index)

    if (value.length === 0) {
      throw new ParserError('Expected spaces or tabs or newlines or CRLF')
    }

    return {
      value: this.code.slice(start, this.index),
      start,
      end: this.index,
    }
  }

  newline(): Token {
    if (this.code[this.index] === '\n') {
      const start = this.index
      this.index++

      return {
        value: '',
        start,
        end: this.index,
      }
    }

    throw new ParserError('Expected newline')
  }

  regex(re: RegExp): Token {
    const match = this.code.slice(this.index).match(re)

    if (!match) {
      throw new ParserError(`Expected regex ${re}`)
    }

    const start = this.index

    this.index += match[0].length

    return {
      value: match[0],
      start: start,
      end: this.index,
    }
  }

  noneOf(chars: string[]) {
    for (const char of chars) {
      if (this.code.slice(this.index, this.index + char.length) === char) {
        throw new ParserError(`Expected none of ${chars}`)
      }
    }
  }

  peek() {
    return this.code[this.index]
  }

  peekN(n: number) {
    return this.code.slice(this.index, this.index + n)
  }

  oneOf(parsers: OneOfParsers): Token {
    for (const key in parsers) {
      const parser = parsers[key]
      const comb = new Honeycomb(this.code)
      comb.index = this.index

      try {
        const output = parser(comb)

        this.index = comb.index

        return output
      } catch (e) {
        continue
      }
    }

    const keys = Object.keys(parsers)
      .map((value) => `'${value}'`)
      .join(', ')

    throw new ParserError(`Expected one of ${keys}`)
  }

  opt(parser: (parser: Honeycomb) => Token) {
    try {
      const comb = new Honeycomb(this.code)
      comb.index = this.index

      const output = parser(comb)

      this.index = comb.index

      return output
    } catch (e) {
      return null
    }
  }

  eof() {
    return this.index >= this.code.length
  }

  debug() {
    console.log(this.code.slice(this.index))
  }
}
