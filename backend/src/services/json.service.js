/* =========================
   Safe JSON Parse
   Tries strict parse first, then trims surrounding noise.
========================= */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch { }
    }
    return null;
  }
}

/* =========================
   JSON Truncation Recovery
   When Llama hits max_gen_len mid-JSON, this closes all open
   strings / arrays / objects so JSON.parse can still succeed.
========================= */
function attemptJsonRecovery(raw) {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let text = raw.slice(start);

  // Close an open string — count unescaped double-quotes
  const quoteCount = (text.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) text += '"';

  // Count open braces and brackets
  let braces = 0, brackets = 0;
  for (const ch of text) {
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }

  // Strip trailing comma before closing containers
  text = text.trimEnd();
  if (text.endsWith(",")) text = text.slice(0, -1);

  text += "]".repeat(Math.max(0, brackets));
  text += "}".repeat(Math.max(0, braces));

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = { safeParse, attemptJsonRecovery };
