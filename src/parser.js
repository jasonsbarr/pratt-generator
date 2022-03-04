import { tokenize } from "./lexer.js";

let rules = {};

export const parse = (input) => tokenize(input);
