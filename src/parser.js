class ParseError extends Error {
  constructor(name, line, col) {
    super(`Unexpected token type ${name} at ${line}:${col}`);
  }
}

const fail = (name, line, col) => {
  throw new ParseError(name, line, col);
};

export const createParser = (operators, { assignPrec = 5 } = {}) => {
  const ops = {};
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

    const parseOde = (left) => ode[token.type](left);

    const parseExpr = (rbp = 0) => {
      let left = parseAtom();
      let prec = getPrec(token.type, "lToken");

      while (rbp < prec) {
        left = parseLed(left);
        prec = getPrec(token.type, "lToken");

        if (isOde(token.type)) {
          left = parseOde(left);
          prec = getPrec(token.type, "lToken");
        }
      }

      if (isOde(token.type)) {
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

    const parseExpression = (bp = 0) => {
      let exp = parseExpr(bp);

      if (seqOps.includes(token.type)) {
        exp = [exp];

        while (seqOps.includes(token.type)) {
          token = next();
          exp.push(parseExpr(0));
        }

        if (isOde(token.type)) {
          exp = parseOde(exp);
        }
      }

      if (assigns.includes(token.type)) {
        exp = parseAssign(exp);
      }

      return exp;
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
              token.type === op.oToken
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
                token.type === op.oToken ? null : parseExpression(op.prec),
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

        /**
         * Ops with variable arity
         */
        if (op.arity === "VARIABLE") {
          if (op.affix === "MATCHFIX") {
            // Operation will have an opening and closing token
            // as well as a separator, which is the led token
            nud[op.nToken] = () => ({
              type: op.id,
              children: [parseExpression(op.prec)],
            });
            led[op.lToken] = (expr) => {
              while (token.type === op.lToken) {
                token = next();
                expr.children.push(parseExpression(op.prec));
              }
              return expr;
            };
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

    return parseExpression();
  };
};
