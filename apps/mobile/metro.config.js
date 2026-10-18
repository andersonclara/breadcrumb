const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, '../../packages/shared/src');
// This applies to the Expo app (including its browser preview), never Next.js.
// Keep full GIS data and offline artwork generators out of the phone's bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@breadcrumb/shared') {
    return { type: 'sourceFile', filePath: path.join(shared, 'index.mobile.ts') };
  }
  const result = context.resolveRequest(context, moduleName, platform);
  if (result.type === 'sourceFile' && result.filePath === path.join(shared, 'campus-map.json')) {
    return { type: 'sourceFile', filePath: path.join(shared, 'campus-mobile.json') };
  }
  return result;
};
module.exports = config;
