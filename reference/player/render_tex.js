const katex = require('/opt/npm-tools/node_modules/katex');
const fs = require('fs');
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = {};
for (const t of list) {
  try { out[t] = katex.renderToString(t, {displayMode: false, output: 'html', throwOnError: true, strict: 'error'}); }
  catch (e) { out[t] = null; console.error('FAIL', t.slice(0, 60), e.message); }
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
