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
      let left = nud[token.name].func();
      token = next();

      let prec = -1;

      if (led[token.name]) {
        prec = led[token.name].prec;
      }

      while (rbp < prec && token.name !== eoiName) {
        let t = token;
        token = next();
        let opts = led[t.name];
        prec = opts.prec;
        left = opts.func(left);
      }

      return left;
    };

    for (let s of syms) {
      registerSymbol(s);

      if (s.den === "NUD") {
        if (s.arity === "NULL") {
          nud[s.name] = { prec: s.prec, func: () => peek() };
        } else if (s.arity === "UNARY") {
          nud[s.name] = { prec: s.prec, func: unop(s.name, s.prec) };
        }
      } else if (s.den === "LED") {
        if (s.arity === "BINARY") {
          led[s.name] = { prec: s.prec, func: binop(s.id, s.prec) };
        }
      }
    }

    return parseExpr(0);
  };
};
