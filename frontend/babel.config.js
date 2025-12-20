module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Remove unnecessary plugins that might slow down bundling
      // ['react-native-dotenv', {
      //   "moduleName": "@env",
      //   "path": ".env",
      //   "blacklist": null,
      //   "whitelist": null,
      //   "safe": false,
      //   "allowUndefined": true
      // }]
    ],
    // Optimize for faster bundling
    env: {
      development: {
        plugins: [],
      },
      production: {
        plugins: [],
      },
    },
  };
};