class ParseError extends Error {
  constructor(name, line, col) {
    super(`Unexpected token type ${name} at ${line}:${col}`);
  }
}

const fail = (name, line, col) => {
  throw new ParseError(name, line, col);
};

export const createParser = (operators, eoiName = "ENDOFINPUT") => {
  const ops = {};
  const seqOps = [];
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

    const binop = (name, bp, tokAssoc, id) => (left) => ({
      type: id,
      left,
      op: name,
      right: parseExpression(bp - assoc[tokAssoc]),
    });

    const unop = (name, bp) => () => ({
      type: "Unary Op",
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

      return left;
    };

    const parseExpression = (bp = 0) => {
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

      return exp;
    };

    const parseToplevel = () => {
      if (!isValidSymbol(token.name)) {
        fail(token.name, token.line, token.col);
      }

      return parseExpression();
    };

    // generate parser
    for (let op of operators) {
      ops[op.id] = setOperatorAtts(op);

      if (op.type === "expr") {
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

        if (op.arity === "NONE") {
          nud[op.nToken] = (expr) => expr;
        }

        if (op.arity === "UNARY") {
          if (op.affix === "PREFIX") {
            nud[op.nToken] = unop(op.nToken, op.prec);
          }

          if (op.affix === "MATCHFIX") {
            nud[op.nToken] = () => parseExpression(op.prec);
            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }

          if (op.affix === "POSTFIX") {
            led[op.lToken] = (expr) => ({ ...expr, type: op.id });
          }
        }

        if (op.arity === "BINARY") {
          if (op.affix === "INFIX") {
            led[op.lToken] = binop(
              op.lToken,
              op.prec,
              op.assoc,
              op.id.toLowerCase().includes("assignment") ? op.id : "Binary Op"
            );
          }

          if (op.affix === "MIXFIX") {
            if (op.nToken) {
              nud[op.nToken] = () => ({
                type: op.id,
                first: parseExpression(op.prec),
              });
            }

            if (op.lToken) {
              led[op.lToken] = (left) => ({
                ...left,
                second: parseExpression(op.prec),
              });
            }

            if (op.oToken) {
              ode[op.oToken] = (expr) => {
                token = next();
                return expr;
              };
            }
          }
        }

        if (op.arity === "TERNARY") {
          if (op.affix === "INFIX") {
            led[op.lToken] = (left) => ({
              type: op.id,
              left,
              middle: parseExpr(op.prec),
            });
            ode[op.oToken] = (expr) => {
              token = next();
              return { ...expr, right: parseExpr(op.prec) };
            };
          }

          if (op.affix === "MIXFIX") {
            nud[op.nToken] = () => ({ type: op.id, first: parseExpr(op.prec) });
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
            nud[op.nToken] = () => ({ type: op.id, exprs: parseExpr(op.prec) });
            ode[op.oToken] = (expr) => {
              token = next();
              return expr;
            };
          }
        }
      }

      if (op.type === "sequence") {
        // add the token name to the sequence operators array
        seqOps.push(op.name);
      }
    }

    return parseToplevel();
  };
};
