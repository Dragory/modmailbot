const path = require("path");
const fs = require("fs");
const toJsdoc = require("json-schema-to-jsdoc");
const schema = require("./cfg.schema.json");
const target = path.join(__dirname, "cfg.jsdoc.js");

// Fix up some custom types for the JSDoc conversion
const schemaCopy = JSON.parse(JSON.stringify(schema));
for (const propertyDef of Object.values(schemaCopy.properties)) {
  if (propertyDef.$ref === "#/definitions/stringArray") {
    propertyDef.type = "array";
    delete propertyDef.$ref;
  } else if (propertyDef.$ref === "#/definitions/customBoolean") {
    propertyDef.type = "boolean";
    delete propertyDef.$ref;
  } else if (propertyDef.$ref === "#/definitions/multilineString") {
    propertyDef.type = "string";
    delete propertyDef.$ref;
  }
}

const result = toJsdoc(schemaCopy);
fs.writeFileSync(target, result, { encoding: "utf8" });
