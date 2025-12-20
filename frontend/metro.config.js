// metro.config.js - Optimized for faster bundling
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');

const config = getDefaultConfig(__dirname);

// Optimize transformer for faster bundling
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // Enable inline requires for better performance
  },
});

// Optimize resolver for better performance
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Only add necessary polyfills to reduce bundle size
if (config.resolver.platforms.includes('web')) {
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
  };
}

// Optimize worker configuration for better performance
const cpuCount = require('os').cpus().length;
config.maxWorkers = Math.max(1, Math.min(4, Math.floor(cpuCount / 2)));

// Use default cache settings
config.cacheStores = [];
config.cacheVersion = 'v2';

// Optimize resolver for faster file resolution
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
