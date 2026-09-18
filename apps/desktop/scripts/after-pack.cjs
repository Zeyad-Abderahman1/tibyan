const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const targetDir = path.join(
    appOutDir,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release'
  );
  const destFile = path.join(targetDir, 'better_sqlite3.node');

  const cacheDir = path.join(context.packager.projectDir, '.native-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const cachedElectronBinary = path.join(cacheDir, 'better_sqlite3_electron_34.node');

  // If already in target and matches cache, we are good
  if (fs.existsSync(destFile) && fs.existsSync(cachedElectronBinary)) {
    const s1 = fs.statSync(destFile).size;
    const s2 = fs.statSync(cachedElectronBinary).size;
    if (s1 === s2) return;
  }

  if (fs.existsSync(cachedElectronBinary)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(cachedElectronBinary, destFile);
    return;
  }

  // Otherwise fetch via prebuild-install and restore host binary
  try {
    const sqlitePkgDir = path.dirname(
      require.resolve('better-sqlite3/package.json', { paths: [context.packager.projectDir] })
    );
    execSync('npx prebuild-install --runtime=electron --target=34.2.0', { cwd: sqlitePkgDir, stdio: 'pipe' });
    const built = path.join(sqlitePkgDir, 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(built)) {
      fs.copyFileSync(built, cachedElectronBinary);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(built, destFile);
      // Restore host binary for Vitest
      execSync('npx prebuild-install', { cwd: sqlitePkgDir, stdio: 'pipe' });
    }
  } catch (err) {
    console.warn('[afterPack] notice while configuring better-sqlite3 for electron:', err.message);
  }
};
