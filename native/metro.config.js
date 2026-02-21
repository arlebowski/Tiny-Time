const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Fix: react-native-safe-area-context "react-native" field points to src/ which fails to resolve InitialWindow.
// Force use of prebuilt lib/commonjs for this package.
// Fix: resolve shared/* from workspace root when default resolution fails
const fs = require('fs');
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-safe-area-context') {
    return {
      filePath: path.resolve(
        projectRoot,
        'node_modules/react-native-safe-area-context/lib/commonjs/index.js'
      ),
      type: 'sourceFile',
    };
  }
  let result = originalResolve
    ? originalResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
  // If resolution failed and path references shared/, try workspace root
  if (!result && (moduleName.includes('shared/') || moduleName.includes('shared\\'))) {
    const relPath = moduleName.replace(/^.*shared[/\\]/, '');
    const candidate = path.join(workspaceRoot, 'shared', relPath);
    const withJs = candidate.endsWith('.js') ? candidate : `${candidate}.js`;
    if (fs.existsSync(withJs)) return { filePath: withJs, type: 'sourceFile' };
    if (fs.existsSync(candidate)) return { filePath: candidate, type: 'sourceFile' };
  }
  return result;
};

module.exports = config;
