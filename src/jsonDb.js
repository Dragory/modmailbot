const fs = require('fs');
const path = require('path');
const config = require('./config');

const dbDir = config.dbDir || `${__dirname}/../db`;

const databases = {};

class JSONDB {
  constructor(path, def = {}, useCloneByDefault = false) {
    this.path = path;
    this.useCloneByDefault = useCloneByDefault;

    this.load = new Promise(resolve => {
      fs.readFile(path, {encoding: 'utf8'}, (err, data) => {
        if (err) return resolve(def);

        let unserialized;
        try { unserialized = JSON.parse(data); }
        catch (e) { unserialized = def; }

        resolve(unserialized);
      });
    });
  }

  get(clone) {
    if (clone == null) clone = this.useCloneByDefault;

    return this.load.then(data => {
      if (clone) return JSON.parse(JSON.stringify(data));
      else return data;
    });
  }

  save(newData) {
    const serialized = JSON.stringify(newData);
    this.load = new Promise((resolve, reject) => {
      fs.writeFile(this.path, serialized, {encoding: 'utf8'}, () => {
        resolve(newData);
      });
    });

    return this.get();
  }
}

function getDb(dbName, def) {
  if (! databases[dbName]) {
    const dbPath = path.resolve(dbDir, `${dbName}.json`);
    databases[dbName] = new JSONDB(dbPath, def);
  }

  return databases[dbName];
}

function get(dbName, def) {
  return getDb(dbName, def).get();
}

function save(dbName, data) {
  return getDb(dbName, data).save(data);
}

module.exports = {
  get,
  save,
};
