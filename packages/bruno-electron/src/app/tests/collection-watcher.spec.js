const fs = require('fs');
const os = require('os');
const path = require('path');

const collectionWatcher = require('../collection-watcher');
const dotEnvWatcher = require('../dotenv-watcher');

const requestYml = (name, seq) => `info:
  name: ${name}
  type: http
  seq: ${seq}

http:
  method: GET
  url: "{{baseUrl}}/ping"

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
  forwardAuthorizationHeader: false
`;

const collectionYml = (ignore = []) => {
  const ignoreBlock = ignore.length ? `    ignore:\n${ignore.map((entry) => `      - ${entry}`).join('\n')}\n` : '';
  return `opencollection: 1.0.0

info:
  name: ignore-regression
  version: "1"
extensions:
  bruno:
${ignoreBlock || '    {}\n'}`;
};

const createFakeWindow = () => {
  const messages = [];
  return {
    messages,
    webContents: {
      send: (channel, ...args) => messages.push({ channel, args })
    }
  };
};

const addedRequestNames = (win) =>
  win.messages
    .filter(({ channel, args }) => channel === 'main:collection-tree-updated' && args[0] === 'addFile')
    .map(({ args }) => path.basename(args[1].meta.pathname));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('collection-watcher', () => {
  let collectionPath;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ignore-'));
    fs.writeFileSync(path.join(collectionPath, 'Ignored Request.yml'), requestYml('Ignored Request', 1));
    fs.writeFileSync(path.join(collectionPath, 'Kept Request.yml'), requestYml('Kept Request', 2));
    fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), collectionYml(['Ignored Request.yml']));
  });

  afterEach(async () => {
    await collectionWatcher.closeAllWatchers();
    await dotEnvWatcher.closeAll();
    fs.rmSync(collectionPath, { recursive: true, force: true });
  });

  it('applies the ignore list handed to addWatcher during the initial scan', async () => {
    const win = createFakeWindow();
    const brunoConfig = { ignore: ['Ignored Request.yml'] };

    collectionWatcher.addWatcher(win, collectionPath, 'uid-ignore-regression', brunoConfig, false, false, {});

    await wait(1500);

    const names = addedRequestNames(win);
    expect(names).toContain('Kept Request.yml');
    expect(names).not.toContain('Ignored Request.yml');
  });
});
