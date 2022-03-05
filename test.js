import { lexer, rule } from "@jasonsbarr/lexer";
import { createParser } from "./src/parser.js";

const rules = [
  rule("WS", "WS", String.raw`\s+`),
  rule("Number", "NUMBER", String.raw`\d+`),
  rule("String", "STRING", String.raw`"(?:\\.|[^\\"])*"?`),
  rule("True", "TRUE", String.raw`true`),
  rule("False", "FALSE", String.raw`false`),
  rule("Null", "NULL", String.raw`null`),
  rule("Symbol", "PLUS", String.raw`\+`),
  rule("Symbol", "MINUS", String.raw`-`),
  rule("Symbol", "EXP", String.raw`\*\*`),
  rule("Symbol", "MUL", String.raw`\*`),
  rule("Symbol", "DIV", String.raw`/`),
  rule("Punc", "LPAREN", String.raw`\(`),
  rule("Punc", "RPAREN", String.raw`\)`),
  rule("Keyword", "IF", String.raw`if`),
  rule("Keyword", "ELSE", String.raw`else`),
  rule("Keyword", "THEN", String.raw`then`),
];
// ([^"\\]\\.)*"

const lex = lexer(rules);

const filterWs = (tokens) => [...tokens].filter((t) => t.type !== "WS");

export const tokenize = (input) =>
  filterWs(lex.compile().input(input).tokenize());

const operators = [
  {
    id: "NumberLiteral",
    nToken: "NUMBER",
    lToken: null,
    oToken: null,
    prec: 0,
    assoc: "NONE",
    affix: "NONE",
    arity: "NONE",
  },
  {
    id: "StringLiteral",
    nToken: "STRING",
    lToken: null,
    oToken: null,
    prec: 0,
    assoc: "NONE",
    affix: "NONE",
    arity: "NONE",
  },
  {
    id: "TrueLiteral",
    nToken: "TRUE",
    lToken: null,
    oToken: null,
    prec: 0,
    assoc: "NONE",
    affix: "NONE",
    arity: "NONE",
  },
  {
    id: "FalseLiteral",
    nToken: "FALSE",
    lToken: null,
    oToken: null,
    prec: 0,
    assoc: "NONE",
    affix: "NONE",
    arity: "NONE",
  },
  {
    id: "NullLiteral",
    nToken: "NULL",
    lToken: null,
    oToken: null,
    prec: 0,
    assoc: "NONE",
    affix: "NONE",
    arity: "NONE",
  },
  {
    id: "Plus",
    nToken: null,
    lToken: "PLUS",
    oToken: null,
    prec: 30,
    assoc: "LEFT",
    affix: "INFIX",
    arity: "BINARY",
  },
  {
    id: "Minus",
    nToken: null,
    lToken: "MINUS",
    oToken: null,
    prec: 30,
    assoc: "LEFT",
    affix: "INFIX",
    arity: "BINARY",
  },
  {
    id: "Mul",
    nToken: null,
    lToken: "MUL",
    oToken: null,
    prec: 40,
    assoc: "LEFT",
    affix: "INFIX",
    arity: "BINARY",
  },
  {
    id: "UPlus",
    nToken: "PLUS",
    lToken: null,
    oToken: null,
    prec: 45,
    assoc: "RIGHT",
    affix: "PREFIX",
    arity: "UNARY",
  },
  {
    id: "UMinus",
    nToken: "MINUS",
    lToken: null,
    oToken: null,
    prec: 45,
    assoc: "RIGHT",
    affix: "PREFIX",
    arity: "UNARY",
  },
  {
    id: "Parentheses",
    nToken: "LPAREN",
    lToken: null,
    oToken: "RPAREN",
    prec: 100,
    assoc: "NONE",
    affix: "MATCHFIX",
    arity: "UNARY",
  },
  {
    id: "IfElse",
    nToken: null,
    lToken: "IF",
    oToken: "ELSE",
    prec: 5,
    assoc: "LEFT",
    affix: "INFIX",
    arity: "TERNARY",
  },
  {
    id: "IfThenElse",
    nToken: "IF",
    lToken: "THEN",
    oToken: "ELSE",
    prec: 5,
    assoc: "LEFT",
    affix: "MIXFIX",
    arity: "TERNARY",
  },
];

const parser = createParser(operators);

export const parse = (input) => parser(tokenize(input));
