import { rule, lexer } from "@jasonsbarr/lexer";

const rules = [
  rule("WS", "WS", String.raw`\s+`),
  rule("Number", "NUMBER", String.raw`\d+`),
  rule("Symbol", "PLUS", String.raw`\+`),
  rule("Symbol", "MINUS", String.raw`-`),
  rule("Symbol", "EXP", String.raw`\*\*`),
  rule("Symbol", "MUL", String.raw`\*`),
  rule("Symbol", "DIV", String.raw`/`),
];

const lex = lexer(rules);

const filterWs = (tokens) => [...tokens].filter((t) => t.type !== "WS");

export const tokenize = (input) =>
  filterWs(lex.compile().input(input).tokenize());
