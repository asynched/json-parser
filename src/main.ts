import { Honeycomb, ParserError } from './parser'

type StringKind = {
  type: 'StringKind'
  start: number
  end: number
  value: string
  raw: string
}

type BooleanKind = {
  type: 'BooleanKind'
  start: number
  end: number
  value: boolean
  raw: string
}

type NumberKind = {
  type: 'NumberKind'
  start: number
  end: number
  value: number
  raw: string
}

type NullKind = {
  type: 'NullKind'
  start: number
  end: number
  raw: string
}

type ArrayKind = {
  type: 'ArrayKind'
  start: number
  end: number
  elements: JSONKind[]
}

type ObjectKind = {
  type: 'ObjectKind'
  start: number
  end: number
  properties: Record<string, JSONKind>
}

type JSONKind =
  | StringKind
  | BooleanKind
  | NumberKind
  | NullKind
  | ArrayKind
  | ObjectKind

function parseObject(parser: Honeycomb): ObjectKind {
  const start = parser.getIndex()
  const properties: Record<string, JSONKind> = {}

  parser.char('{')
  parser.multispace0()

  while (!parser.eof() && parser.peek() !== '}') {
    parser.char('"')
    const key = parser.alpha1()
    parser.char('"')
    parser.multispace0()
    parser.char(':')
    parser.multispace0()
    const value = parseValue(parser)
    parser.multispace0()

    if (parser.peek() === ',') {
      parser.char(',')
      parser.multispace0()
    }

    properties[key.value] = value
  }

  parser.char('}')

  return {
    type: 'ObjectKind',
    properties,
    start,
    end: parser.getIndex(),
  }
}

function parseString(parser: Honeycomb): StringKind {
  const value = parser.regex(/"([^"]*)"/)

  return {
    type: 'StringKind',
    start: value.start,
    end: value.end,
    value: value.value.slice(1, -1),
    raw: value.value,
  }
}

function parseNumber(parser: Honeycomb): NumberKind {
  const sign = parser.opt((p) => p.char('-'))

  const integerPart = parser.digit1()

  if (parser.peek() === '.') {
    parser.char('.')
    const decimalPart = parser.digit1()

    return {
      type: 'NumberKind',
      start: integerPart.start,
      end: decimalPart.end,
      value: parseFloat(
        `${sign ? '-' : ''}${integerPart.value}.${decimalPart.value}`
      ),
      raw: `${sign ? '-' : ''}${integerPart.value}.${decimalPart.value}`,
    }
  }

  return {
    type: 'NumberKind',
    start: integerPart.start,
    end: integerPart.end,
    value: parseInt(`${sign ? '-' : ''}${integerPart.value}`),
    raw: `${sign ? '-' : ''}${integerPart.value}`,
  }
}

function parseArray(parser: Honeycomb): ArrayKind {
  const start = parser.getIndex()

  parser.char('[')
  parser.multispace0()

  const values: any[] = []

  while (!parser.eof() && parser.peek() !== ']') {
    const value = parseValue(parser)
    parser.multispace0()

    if (parser.peek() === ',') {
      parser.char(',')
      parser.multispace0()
    }

    values.push(value)
  }

  parser.char(']')

  return {
    type: 'ArrayKind',
    elements: values,
    start,
    end: parser.getIndex(),
  }
}

function parseBoolean(parser: Honeycomb): BooleanKind {
  const output = parser.oneOf({
    true: (p) => p.literal('true'),
    false: (p) => p.literal('false'),
  })

  return {
    type: 'BooleanKind',
    start: output.start,
    end: output.end,
    value: output.value === 'true',
    raw: output.value,
  }
}

function parseNull(parser: Honeycomb): NullKind {
  const output = parser.literal('null')

  return {
    type: 'NullKind',
    start: output.start,
    end: output.end,
    raw: output.value,
  }
}

function parseValue(parser: Honeycomb): JSONKind {
  // Trim whitespace before continuing
  parser.multispace0()

  // Is object
  if (parser.peek() === '{') {
    return parseObject(parser)
  }

  // Is boolean literal
  if (parser.peek() === 't' || parser.peek() === 'f') {
    return parseBoolean(parser)
  }

  // Is string literal
  if (parser.peek() === '"') {
    return parseString(parser)
  }

  // Is null literal
  if (parser.peek() === 'n') {
    return parseNull(parser)
  }

  // Is array
  if (parser.peek() === '[') {
    return parseArray(parser)
  }

  // Is number
  if (/\d/.test(parser.peek()) || /-\d/.test(parser.peekN(2))) {
    return parseNumber(parser)
  }

  throw new ParserError('Invalid value')
}

const parser = new Honeycomb(await Bun.file('person.json').text())

const output = parseValue(parser)

console.log(JSON.stringify(output, null, 2))
