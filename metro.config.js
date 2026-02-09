const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .wasm to asset extensions so Metro can bundle it for expo-sqlite web
config.resolver.assetExts.push('wasm');

module.exports = config;
