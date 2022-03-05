import { lexer, rule } from "@jasonsbarr/lexer";
import { createParser } from "./src/parser.js";

import { rule, lexer } from "@jasonsbarr/lexer";

const rules = [
  rule("WS", "WS", String.raw`\s+`),
  rule("Number", "NUMBER", String.raw`\d+`),
  rule("String", "STRING", String.raw`"([^"\\]\\.)*"`),
  rule("Symbol", "PLUS", String.raw`\+`),
  rule("Symbol", "MINUS", String.raw`-`),
  rule("Symbol", "EXP", String.raw`\*\*`),
  rule("Symbol", "MUL", String.raw`\*`),
  rule("Symbol", "DIV", String.raw`/`),
  rule("Punc", "LPAREN", String.raw`\(`),
  rule("Punc", "RPAREN", String.raw`\)`),
  rule("Keyword", "IF", String.raw`if`),
  rule("Keyword", "ELSE", String.raw`else`),
];

const lex = lexer(rules);

const filterWs = (tokens) => [...tokens].filter((t) => t.type !== "WS");

const tokenize = (input) => filterWs(lex.compile().input(input).tokenize());

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
];

const parser = createParser(operators);

export const parse = (input) => parser(tokenize(input));
