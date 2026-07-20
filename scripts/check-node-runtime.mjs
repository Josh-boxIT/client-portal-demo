const expectedMajor = 22;
const actualMajor = Number(process.versions.node.split('.')[0]);

if (actualMajor !== expectedMajor) {
  console.error([
    `This repository requires Node 22.x; the current runtime is ${process.version}.`,
    'Run `nvm use` (or select the version in `.node-version`) before installing dependencies or starting the demo.',
    'Using another Node major can replace the native better-sqlite3 binary with an incompatible build.',
  ].join('\n'));
  process.exit(1);
}
