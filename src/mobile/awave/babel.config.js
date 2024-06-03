module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: [
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.android.js',
            '.android.tsx',
            '.ios.js',
            '.ios.tsx',
          ],
          alias: {
            // Define your aliases here
            "@root": "./src",
            "@screens": "./src/screens",
            "@utils": "./src/utils",
            "@assets": "./src/assets",
            "@navigation": "./src/navigation",
            // Add more as needed
          },
        },
      ],
    ],
  };
};
