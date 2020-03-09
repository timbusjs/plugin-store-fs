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

async function fsStorePlugin(logger, dataDir) {
  const assignmentFile = path.join(dataDir, 'assignments.json');

  const filePath = path.join(dataDir, 'files');

  const exists = await fs.exists(filePath);

  if (!exists) {
    await fs.mkdir(filePath);
  }

  const createPathToUser = uid => path.join(filePath, uid + '.json');

  const self = {
    assignments: async () => {
      const text = await fs.readFile(assignmentFile);
      return JSON.parse(text);
    },
    put: async data => {
      const dataFilePath = createPathToUser(data.uid);
      let submissions = await self.get({ uid: data.uid });
      const old = submissions.filter(s => s.aid === data.aid);
      if (old.length !== 0) {
        submissions = submissions.map(s => {
          if (s.aid === data.aid) {
            return data;
          } else {
            return s;
          }
        });
      } else {
        submissions = [...submissions, data];
      }
      await fs.writeFile(dataFilePath, JSON.stringify(submissions));
    },
    get: async (query = {}) => {
      if (query.uid) {
        const userPath = createPathToUser(query.uid);
        const exists = await fs.exists(userPath);
        if (!exists) {
          await fs.writeFile(userPath, JSON.stringify([]));
          return [];
        }
        const text = await fs.readFile(userPath);
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
            yield JSON.parse(await fs.readFile(path.join(filePath, file)));
          }
        }

        let submissions = [];
        for await (const data of getUserData()) {
          if (query.aid) {
            submissions = submissions.concat(data.filter(d => d.aid === query.aid));
          } else {
            submissions = submissions.concat(data);
          }
        }

        return submissions;
      }
    }
  };

  return self;
}

module.exports = fsStorePlugin;
