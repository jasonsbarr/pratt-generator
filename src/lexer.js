import { rule, lexer } from "@jasonsbarr/lexer";

const rules = [
  rule("Number", "NUMBER", String.raw`\d+`),
  rule("Symbol", "EXP", String.raw`\*\*`),
  rule("Symbol", "PLUS", String.raw`\+`),
  rule("Symbol", "MINUS", String.raw`\-`),
  rule("Symbol", "MUL", String.raw`\*`),
  rule("Symbol", "DIV", String.raw`\/`),
];

const lex = lexer(rules);

export const tokenize = (input) => lex.compile().input(input).tokenize();
