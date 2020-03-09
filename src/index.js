const nfs = require('fs');
const util = require('util');
const path = require('path');

const fs = {
  exists: util.promisify(nfs.exists),
  mkdir: util.promisify(nfs.mkdir),
  readFile: util.promisify(nfs.readFile),
  writeFile: util.promisify(nfs.writeFile),
  readDir: util.promisify(nfs.readdir)
};

async function fsStorePlugin(dataDir) {
  const assignmentFile = path.join(dataDir, 'assignments.json');

  const filePath = path.join(dataDir, 'files');

  const exists = await fs.exists(filePath);

  if (!exists) {
    await fs.mkdir(filePath);
  }

  const createPathToUser = uid => path.join(filePath, uid + '.json');

  return {
    assignments: async () => {
      const text = await fs.readFile(assignmentFile);
      return JSON.parse(text);
    },
    put: async data => {
      const dataFilePath = createPathToUser(data.uid);
      await fs.writeFile(dataFilePath, JSON.stringify(data));
    },
    get: async query => {
      if (query.uid) {
        const text = await fs.readFile(createPathToUser(query.uid));
        const submissions = JSON.parse(text);
        if (query.aid) {
          return submissions.filter(s => s.aid === query.aid);
        } else {
          return submissions;
        }
      } else {
        async function* getUserData() {
          const files = await fs.readDir(filePath);
          for (const file of files) {
            yield JSON.parse(await fs.readFile(file));
          }
        }

        const submissions = [];
        for await (const data of getUserData()) {
          if (query.aid) {
            submissions.concat(data.filter(d => d.aid === query.aid));
          } else {
            submissions.concat(data);
          }
        }

        return submissions;
      }
    }
  };
}

module.exports = fsStorePlugin;
