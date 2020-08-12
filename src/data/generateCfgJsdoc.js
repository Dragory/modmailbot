const path = require('path');
const fs = require('fs');
const toJsdoc = require('json-schema-to-jsdoc');
const schema = require('./cfg.schema.json');
const target = path.join(__dirname, 'cfg.jsdoc.js');

const result = toJsdoc(schema);
fs.writeFileSync(target, result, { encoding: 'utf8' });
