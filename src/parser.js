class ParseError extends Error {
  constructor(name, line, col) {
    super(`Unexpected token type ${name} at ${line}:${col}`);
  }
}

export const createParser = (syms, eoiName = "ENDOFINPUT") => {
  const symbols = {};
  const assoc = { NONE: 0, LEFT: 0, RIGHT: 1 };
  const nud = {};
  const led = {};
  const ode = {};
  const setTokenAtts = ({
    id,
    type,
    name,
    den = "NUD",
    prec = 0,
    assoc = "NONE",
    arity = "NULL",
  }) => ({
    id,
    type,
    name,
    den,
    prec,
    assoc,
    arity,
  });
  const registerSymbol = (sym) => (symbols[sym.id] = setTokenAtts(sym));

  return (tokens) => {
    let pos = 0;

    const next = () => tokens[++pos];
    const peek = () => tokens[pos];
    let token = peek();

    const getPrec = (name, den) => {
      for (let { name: n, den: d, prec } of Object.values(symbols)) {
        if (name === n && den === d) {
          return prec;
        }
      }
      return -1;
    };

    const binop = (id, bp) => (left) => {
      const op = symbols[id];
      return {
        type: "BinOp",
        left,
        op: op.name,
        right: parseExpr(bp - assoc[op.assoc]),
      };
    };
    const unop = (name, bp) => () => ({
      type: "UnOp",
      op: name,
      expr: parseExpr(bp),
    });

    const parseExpr = (rbp = 0) => {
      // token is nonlocal
      let t = token;
      token = next();
      let left = nud[t.name](t);

      let prec = getPrec(token.name, "LED");

      while (rbp < prec && token.name !== eoiName) {
        t = token;
        token = next();
        prec = getPrec(token.name, "LED");
        left = led[t.name](left);
      }

      return left;
    };

    for (let s of syms) {
      registerSymbol(s);

      if (s.den === "NUD") {
        if (s.arity === "NULL") {
          nud[s.name] = (tok) => tok;
        } else if (s.arity === "UNARY") {
          nud[s.name] = unop(s.name, s.prec);
        }
      } else if (s.den === "LED") {
        if (s.arity === "BINARY") {
          led[s.name] = binop(s.id, s.prec);
        }
      }
    }

    return parseExpr(0);
  };
};
