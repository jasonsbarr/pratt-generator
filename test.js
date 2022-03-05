import { tokenize } from "./src/lexer.js";
import { createParser } from "./src/parser.js";

const symbols = [
  {
    type: "Literal",
    name: "NUMBER",
    prec: 0,
    den: "NUD",
    assoc: "NONE",
    arity: "NULL",
  },
  {
    type: "Symbol",
    name: "PLUS",
    prec: 30,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    type: "Symbol",
    name: "PLUS",
    prec: 45,
    den: "NUD",
    assoc: "RIGHT",
    arity: "UNARY",
  },
  {
    type: "Symbol",
    name: "MINUS",
    prec: 30,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    type: "Symbol",
    name: "MINUS",
    prec: 45,
    den: "NUD",
    assoc: "RIGHT",
    arity: "UNARY",
  },
  {
    type: "Symbol",
    name: "MUL",
    prec: 35,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    type: "Symbol",
    name: "DIV",
    prec: 35,
    den: "LED",
    assoc: "LEFT",
    arity: "BINARY",
  },
  {
    type: "Symbol",
    name: "EXP",
    prec: 40,
    den: "LED",
    assoc: "RIGHT",
    arity: "BINARY",
  },
  {
    type: "EndOfInput",
    name: "ENDOFINPUT",
    prec: -1,
    den: "NUD",
    assoc: "NONE",
    arity: "NULL",
  },
];

const parser = createParser(symbols);

export const parse = (input) => parser(tokenize(input));
