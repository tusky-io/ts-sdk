const webpack = require('webpack');

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'src/__tests__/**/*.browser.test.ts'
    ],
    preprocessors: {
      'src/__tests__/**/*.browser.test.ts': ['webpack']
    },
    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
          }
        ]
      },
      resolve: {
        extensions: ['.ts', '.js']
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('test')
        })
      ]
    },
    browsers: ['Chrome'],
    singleRun: true
  });
};
