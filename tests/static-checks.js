'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['index.html','english.html','math.html','math-unit1.html','math-unit2.html'];
let scripts = 0, links = 0;
for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(html, /<!doctype html>/i, `${file}: doctype`);
  assert.match(html, /charset=["']utf-8["']/i, `${file}: UTF-8`);
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const ids = [...markup.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate static IDs`);
  for (const [i, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    new vm.Script(match[1], { filename: `${file}:script${i + 1}` }); scripts++;
  }
  for (const match of markup.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const url = match[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|#)/i.test(url)) continue;
    const local = url.split(/[?#]/)[0];
    assert.ok(fs.existsSync(path.resolve(root, local)), `${file}: broken link ${url}`); links++;
  }
}
console.log(`PASS: ${pages.length} HTML pages, ${scripts} inline scripts parsed, ${links} local links resolved`);
