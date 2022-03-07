const isTerminal = (sym) => sym === sym.toUpperCase();
const getLines = (rules) => {
  if (!rules.includes("\r\n") && !rules.includes("\n")) {
    return [rules];
  }

  const cr = rules.split("\r\n");
  const rs = cr.length > 1 ? cr : rules.split("\n");
  return rs.filter((r) => r !== "");
};
const splitRule = (rule) => rule.split(" ").filter((w) => w !== "");
const isKleene = (rule) =>
  rule.endsWith("?") || rule.endsWith("*") || rule.endsWith("+");
const getKleene = (rule) => rule.slice(-1);
const isOpt = (rule) => rule.includes("|");
const splitOpts = (rule) => rule.slice(1, -1).split("|");
const hasField = (rule) => rule.includes(":");
const getFieldRule = (rule) => rule.split(":"); // returns array pair for destructuring

const makeRulePart = (word) => {
  const [field, ruleStr] = hasField(word) ? getFieldRule(word) : [null, word];
  const [required, rule] = isKleene(ruleStr)
    ? [getKleene(ruleStr), ruleStr.slice(0, -1)]
    : ["yes", ruleStr];
  const options = isOpt(ruleStr) ? splitOpts(ruleStr) : null;
  const terminal = isTerminal(ruleStr);

  return { field, required, rule, options, terminal };
};

const makeRule = (ruleArr) => {
  const [name, ...rest] = ruleArr;
  return [name, rest.map(makeRulePart)];
};

export const parseRules = (rules) => {
  const lines = getLines(rules);
  let rulesObj = {};

  for (let line of lines) {
    const [name, parts] = makeRule(splitRule(line));
    rulesObj[name] = parts;
  }

  return rulesObj;
};
