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

module.exports = config;
