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
  const nuds = [];
  const leds = [];
  const odes = [];
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
    const isNud = (name) => nuds.includes(name);
    const isLed = (name) => leds.includes(name);
    const isOde = (name) => odes.includes(name);

    const isValidSymbol = (name) => [...nuds, ...leds, ...odes].includes(name);

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
        op: t.name,
        left,
        right: parseExpression(assignPrec),
      };
    };

    const match = (name) => token.name === name;

    const eat = (name) => {
      if (token.name !== name) {
        fail(token.name, token.line, token.col);
      }

      return next();
    };

    const tryParseRule = (rule) => {
      return null;
    };

    const tryParse = (tName) => {
      let p = pos;
      let options = dispatchRules[tName];

      for (let opt of options) {
        let exp = tryParseRule(pRules[opt]);

        if (exp) {
          return exp;
        }

        // rewind the token stream to try the next option
        pos = p;
        token = tokens[pos];
      }

      // no rule matched - error
      throw new Error(
        `No matching rule found for token ${token.name} at ${token.line}:${token.col}`
      );
    };

    const parseExpression = (bp = 0) => {
      const isRule = token.name in dispatchRules;

      if (isRule) {
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
      console.log("rules:", pRules);

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
        if (op.nToken) {
          nuds.push(op.nToken);
        }

        if (op.lToken) {
          leds.push(op.lToken);
        }

        if (op.oToken) {
          odes.push(op.oToken);
        }

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
       * Separaters for operation sequences
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
