"use strict";

const fs = require('fs');

const html = fs.readFileSync(`${__dirname}/../src/base.html`, 'utf8');

const tpl = "export default (data: string) => `" + html.replace('$DATA', '${data}').replace('`', '\\`') + "`;\n";

fs.writeFileSync(`${__dirname}/../src/base.html.ts`, tpl);
