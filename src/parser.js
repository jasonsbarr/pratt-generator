export const createParser = (syms) => {
  const symbols = {};
  const assoc = { NONE: 0, LEFT: 0, RIGHT: 1 };
  const nud = {};
  const led = {};
  const setTokenAtts = ({
    type,
    name,
    den = "NUD",
    prec = 0,
    assoc = "NONE",
    arity = "NULL",
  }) => ({
    type,
    name,
    den,
    prec,
    assoc,
    arity,
  });
  const registerSymbol = (sym) => (symbols[sym.name] = setTokenAtts(sym));

  return (tokens) => {
    let pos = 0;

    const next = () => tokens[++pos];
    const peek = () => tokens[pos];

    const binop = (name, bp) => (left) => {
      const op = symbols[name];
      return {
        type: "BinOp",
        left,
        op: name,
        right: parseExpr(bp - assoc[op.assoc]),
      };
    };
    const unop = (name, bp) => () => ({
      type: "UnOp",
      op: name,
      expr: parseExpr(bp),
    });

    const parseExpr = (rbp = 0) => {
      let token = peek();
      let left = nud[token.name]();
      token = next();

      while (rbp < symbols[token.name].prec) {
        let t = token;
        token = next();
        left = led[t.name](left);
      }

      return left;
    };

    for (let s of syms) {
      registerSymbol(s);

      if (s.den === "NUD") {
        if (s.arity === "NULL") {
          nud[s.name] = () => peek();
        } else if (s.arity === "UNARY") {
          nud[s.name] = unop(s.name, s.prec);
        }
      } else if (s.den === "LED") {
        if (s.arity === "BINARY") {
          led[s.name] = binop(s.name, s.prec);
        }
      }
    }

    return parseExpr(0);
  };
};
