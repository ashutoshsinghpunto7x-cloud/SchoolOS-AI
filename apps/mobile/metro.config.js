// Metro config for the monorepo: this app lives in apps/mobile but depends on
// workspace packages (e.g. @schoolos/types) that are hoisted to the repo root
// node_modules, so Metro needs to watch and resolve from the workspace root.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// @schoolos/types resolves to TS source (not a prebuilt dist) — same as web's usage.
config.resolver.disableHierarchicalLookup = false;

// The extra `nodeModulesPaths` entry above (needed so @schoolos/types and other
// hoisted workspace packages resolve) also makes `react` ambiguous: the root
// node_modules holds a *second* copy (18.x, pinned for apps/web) alongside
// this app's own react 19.x. react-native itself lives only at the workspace
// root, so its internal files (e.g. ReactFabric-dev.js) walk up from *there*
// and find the root's react 18.3.1 first — a normal, successful resolution —
// while this app's own source resolves its local react 19.1.0. Two live React
// instances in one bundle crashes Fabric's renderer (its internals object
// comes from whichever copy React was loaded from) with cryptic
// "Cannot read property 'S'/'default' of undefined" instead of the usual
// "Invalid hook call" warning.
//
// `extraNodeModules` alone doesn't fix this — it's only consulted when normal
// resolution *fails*, and the root copy resolves just fine. `resolveRequest`
// is a hard override: force every `react`/`react/jsx(-dev)-runtime` require,
// from any file at any depth, to this app's single canonical copy.
const REACT_ALIASES = {
  react: path.resolve(projectRoot, 'node_modules/react/index.js'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime.js'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const alias = REACT_ALIASES[moduleName];
  if (alias) {
    return { type: 'sourceFile', filePath: alias };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
