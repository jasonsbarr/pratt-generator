import { tokenize } from "./src/lexer.js";
import { createParser } from "./src/parser.js";

const symbols = [
  {
    id: "NumberLiteral",
    type: "Literal",
    name: "NUMBER",
    prec: 0,
    den: "NUD",
    assoc: "NONE",
    arity: "NULL",
  },
  {
    id: "PLUS",
    type: "Symbol",
    name: "PLUS",
    prec: 30,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    id: "UPLUS",
    type: "Symbol",
    name: "PLUS",
    prec: 45,
    den: "NUD",
    assoc: "RIGHT",
    arity: "UNARY",
  },
  {
    id: "MINUS",
    type: "Symbol",
    name: "MINUS",
    prec: 30,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    id: "UMINUS",
    type: "Symbol",
    name: "MINUS",
    prec: 45,
    den: "NUD",
    assoc: "RIGHT",
    arity: "UNARY",
  },
  {
    id: "MUL",
    type: "Symbol",
    name: "MUL",
    prec: 35,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    id: "DIV",
    type: "Symbol",
    name: "DIV",
    prec: 35,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    id: "EXP",
    type: "Symbol",
    name: "EXP",
    prec: 40,
    den: "LED",
    assoc: "RIGHT",
    arity: "BINARY",
  },
];

const parser = createParser(symbols);

export const parse = (input) => parser(tokenize(input));
