import { parseRules } from "./rule_parser.js";

class ParseError extends Error {
  constructor(name, line, col) {
    super(`Unexpected token type ${name} at ${line}:${col}`);
  }
}

const fail = (name, line, col) => {
  throw new ParseError(name, line, col);
};

export const createParser = (
  operators,
  { assignPrec = 5, eoi = "ENDOFINPUT", rules = null } = {}
) => {
  const ops = {};
  let pRules = {};
  let dispatchRules = {};
  const seqOps = [];
  const terms = [];
  const assigns = [];
  const assoc = { NONE: 0, LEFT: 0, RIGHT: 1 };
  const nud = {};
  const led = {};
  const ode = {};
  const setOperatorAtts = ({
    id,
    nToken,
    lToken,
    oToken,
    prec,
    assoc,
    affix,
    arity,
  }) => ({
    id,
    nToken,
    lToken,
    oToken,
    prec,
    assoc,
    affix,
    arity,
  });

  return (tokens) => {
    let pos = 0;

    const next = () => tokens[++pos];
    const peek = () => tokens[pos];
    let token = peek();

    /**
     * Get the precedence of an operation. Call like getPrec("MINUS", "lToken")
     */
    const getPrec = (token, den) => {
      for (let op of Object.values(operators)) {
        if (token === op[den]) {
          return op.prec;
        }
      }
      return -1;
    };
    const isNud = (name) => name in nud;
    const isLed = (name) => name in led;
    const isOde = (name) => name in ode;

    const isValidSymbol = (name) =>
      [
        ...Object.keys(nuds),
        ...Object.keys(leds),
        ...Object.keys(odes),
      ].includes(name);

    const binop = (name, bp, tokAssoc) => (left) => ({
      type: "BinaryOp",
      left,
      op: name,
      right: parseExpression(bp - assoc[tokAssoc]),
    });

    const unop =
      (name, bp, id = "UnaryOp") =>
      () => ({
        type: id,
        op: name,
        expr: parseExpression(bp),
      });

    const parseAtom = () => {
      // token is nonlocal
      let t = token;
      token = next();

      if (!isNud(t.name)) {
        fail(t.name, t.line, t.col);
      }

      return nud[t.name](t);
    };

    const parseLed = (left) => {
      let t = token;
      token = next();
      return led[t.name](left);
    };

    const parseOde = (left) => ode[token.name](left);

    const parseExpr = (rbp = 0) => {
      let left = parseAtom();
      let prec = getPrec(token.name, "lToken");

      while (rbp < prec) {
        left = parseLed(left);
        prec = getPrec(token.name, "lToken");

        if (isOde(token.name)) {
          left = parseOde(left);
          prec = getPrec(token.name, "lToken");
        }
      }

      if (isOde(token.name)) {
        left = parseOde(left);
      }

      return left;
    };

    const parseAssign = (left) => {
      let t = token;
      token = next();

      return {
        type: "Assign",
        op: t.val,
        left,
        right: parseExpression(assignPrec),
      };
    };

    const match = (name) => token.name === name;

    const eat = (name) => {
      if (token.name !== name) {
        fail(token.name, token.line, token.col);
      }

      let t = token;
      token = next();
      return t;
    };

    const isGroup = (name) => name.startsWith("[");

    const parseRequired = ({ terminal, rule }) => {
      if (terminal) {
        return eat(rule);
      }

      return tryParse(rule);
    };

    const parseZeroOrOne = ({ terminal, rule }) => {
      if (terminal) {
        if (match(rule)) {
          return eat(rule);
        }
        return null;
      }

      return tryParse(rule);
    };

    const parseZeroOrMore = ({ terminal, rule }) => {
      let exp = null;
      if (terminal) {
        if (match(rule)) {
          exp = [eat(rule)];

          while (seqOps.includes(token.name)) {
            token = next();
            exp.push(eat(rule));
          }
        }
      }

      try {
        exp = [tryParse(rule)];

        while (seqOps.includes(token.name)) {
          exp.push(tryParse(rule));
        }
      } catch (e) {
        // zero occurrences of the rule is fine in this case
      }

      return exp;
    };

    const parseOneOrMore = ({ terminal, rule }) => {
      let exp = [];

      if (terminal) {
        exp.push(eat(rule));

        while (seqOps.includes(token.name)) {
          exp.push(eat(rule));
        }
      }

      // in this case, zero occurrences is not ok so let error go unhandled
      exp.push(tryParse(rule));

      while (seqOps.includes(token.name)) {
        exp.push(tryParse(rule));
      }

      return exp;
    };

    const tryParseRulePart = (part) => {
      let field = part.field;
      let value = null;

      // handle simple required rule
      if (part.required === "yes") {
        value = parseRequired(part);
      }

      // handle ?
      if (part.required === "?") {
        value = parseZeroOrOne(part);
      }

      // handle *
      if (part.required === "*") {
        value = parseZeroOrMore(part);
      }

      // handle +
      if (part.required === "+") {
        value = parseOneOrMore(part);
      }

      return [field, value];
    };

    const tryParseRule = (rule) => {
      console.log(rule);
      let parsed;
      for (let part of rule) {
        try {
          let [field, value] = tryParseRulePart(part);
          if (field) {
            parsed = parsed ? { ...parsed } : {};
            parsed[field] = value;
          }
        } catch (e) {
          return null;
        }
      }
      return parsed;
    };

    const tryParse = (name) => {
      let p = pos;
      // first, see if there's a token name dispatcher for {name}
      let options = dispatchRules[name] ? dispatchRules[name] : [];

      for (let opt of options) {
        let exp = tryParseRule(pRules[opt]);

        if (exp) {
          return exp;
        }

        // rewind the token stream to try the next option
        pos = p;
        token = tokens[pos];
      }

      // if no named token dispatcher matched, see if the name matches a parse rule
      if (name in pRules) {
        exp = tryParseRule(pRules[name]);
        if (exp) {
          return exp;
        }
      }

      // rewind the token stream to try parsing an operation
      pos = p;
      token = tokens[pos];

      // if no parse rule matched, see if the name is a named operation
      if (name in ops) {
        return parseExpression();
      }

      // no rule matched - error
      throw new Error(
        `No matching rule found for token ${token.name} at ${token.line}:${token.col}`
      );
    };

    const parseExpression = (bp = 0) => {
      if (token.name in dispatchRules) {
        console.log(token.name);
        return tryParse(token.name);
      }

      let exp = parseExpr(bp);

      if (seqOps.includes(token.name)) {
        exp = [exp];

        while (seqOps.includes(token.name)) {
          token = next();
          exp.push(parseExpr(0));
        }

        if (isOde(token.name)) {
          exp = parseOde(exp);
        }
      }

      if (assigns.includes(token.name)) {
        exp = parseAssign(exp);
      }

      return exp;
    };

    const parseToplevel = () => {
      // if (!isValidSymbol(token.name)) {
      //   fail(token.name, token.line, token.col);
      // }

      return parseExpression();
    };

    // generate parser
    for (let op of operators) {
      ops[op.id] = setOperatorAtts(op);

      /**
       * Types of operations
       */
      if (op.type === "oper") {
        // Create expression rules for the operator
        /**
         * 0-arity operations, e.g. literals
         */
        if (op.arity === "NONE") {
          nud[op.nToken] = (expr) => expr;
        }

        /**
         * Unary operations
         */
        if (op.arity === "UNARY") {
          if (op.affix === "PREFIX") {
            nud[op.nToken] = unop(op.nToken, op.prec);
          }

          if (op.affix === "INFIX") {
            led[op.lToken] = unop(op.lToken, op.prec, op.id);
            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }

          if (op.affix === "MATCHFIX") {
            nud[op.nToken] = () =>
              token.name === op.oToken
                ? op.id
                  ? { type: op.id, value: null }
                  : fail("EMPTY UNARY MATCHFIX OPERATOR", token.line, token.col)
                : op.id
                ? { type: op.id, value: parseExpression(op.prec) }
                : parseExpression(op.prec);
            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }

          if (op.affix === "POSTFIX") {
            led[op.lToken] = (expr) => ({ ...expr, type: op.id });
          }
        }

        /**
         * Binary operations
         */
        if (op.arity === "BINARY") {
          if (op.affix === "INFIX") {
            led[op.lToken] = binop(op.lToken, op.prec, op.assoc, op.id);
          }

          if (op.affix === "MIXFIX") {
            if (op.nToken) {
              nud[op.nToken] = () => {
                return {
                  type: op.id,
                  first: parseExpression(op.prec),
                };
              };
            }

            if (op.lToken) {
              led[op.lToken] = (left) => {
                return {
                  ...left,
                  second: parseExpression(op.prec),
                };
              };
            }

            if (op.oToken) {
              ode[op.oToken] = (expr) => {
                token = next();
                return expr;
              };
            }
          }

          if (op.affix === "MATCHFIX") {
            led[op.lToken] = (left) => ({
              type: op.id,
              first: left,
              second:
                token.name === op.oToken ? null : parseExpression(op.prec),
            });

            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }
        }

        /**
         * Ternary operations
         */
        if (op.arity === "TERNARY") {
          if (op.affix === "INFIX") {
            led[op.lToken] = (left) => ({
              type: op.id,
              left,
              middle: parseExpression(op.prec),
            });
            ode[op.oToken] = (expr) => {
              token = next();
              return { ...expr, right: parseExpression(op.prec) };
            };
          }

          if (op.affix === "MIXFIX") {
            nud[op.nToken] = () => ({
              type: op.id,
              first: parseExpression(op.prec),
            });
            led[op.lToken] = (left) => ({
              ...left,
              middle: parseExpr(op.prec),
            });
            ode[op.oToken] = (expr) => {
              token = next();
              return { ...expr, right: parseExpr(op.prec) };
            };
          }

          if (op.affix === "MATCHFIX") {
            nud[op.nToken] = () => ({
              type: op.id,
              exprs: parseExpression(op.prec),
            });
            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }
        }
      }

      /**
       * Separators for operation sequences
       */
      if (op.type === "sequence") {
        // add the token name to the sequence operators array
        seqOps.push(op.name);
      }

      /**
       * Operation terminators, e.g. semicolon in C
       */
      if (op.type === "terminator") {
        terms.push(op.name);
      }

      /**
       * Assignment-specific operators
       */
      if (op.type === "assign") {
        assigns.push(op.name);
      }
    }

    /**
     * Parse rules, if any
     */
    if (rules) {
      pRules = parseRules(rules);

      // Create dispatch table on initial tokens
      for (let [name, rule] of Object.entries(pRules)) {
        let rulesSet = [];
        if (rule[0].terminal) {
          dispatchRules[rule[0].rule] = dispatchRules[rule[0].rule]
            ? [...dispatchRules[rule[0].rule], name]
            : [name];

          rulesSet.push(name);
        }
      }
    }

    return parseToplevel();
  };
};
