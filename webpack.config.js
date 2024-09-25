const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const commonNodeConfig = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'node',
  externals: [nodeExternals()], // Exclude node_modules from the bundle
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.node.json" })],
    alias: {
      '@env/types': path.resolve(__dirname, 'src/types/node'),
    }
  },
  // output: {
  //   path: path.resolve(__dirname, 'lib/node'),
  //   filename: 'index.js',
  //   libraryTarget: 'commonjs2'
  // },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.node.json',
              compiler: 'ts-patch/compiler'           
            },
          }
        ],
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        keep_classnames: true,
        keep_fnames: true,
      },
    })],
  },
};

const cjsNodeConfig = {
  ...commonNodeConfig,
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'lib/node/cjs'),
    library: {
      type: 'commonjs2',
    },
  },
};

const esmNodeConfig = {
  ...commonNodeConfig,
  output: {
    filename: 'index.esm.js',
    path: path.resolve(__dirname, 'lib/node/esm'),
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
  },
};

const commonWebConfig = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'web',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.web.json" })],
    alias: {
      '@env/types': path.resolve(__dirname, 'src/types/web'),
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.web.json',
              compiler: 'ts-patch/compiler',
            },
          }
        ],
        exclude: /node_modules/,
      },
    ],
  },
  // devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false,
        },
      },
      extractComments: false,
    })],
  },
};

const cjsWebConfig = {
  ...commonWebConfig,
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'lib/web/cjs'),
    library: {
      type: 'commonjs2',
    },
    globalObject: 'this',
  },
};

const esmWebConfig = {
  ...commonWebConfig,
  output: {
    filename: 'index.esm.js',
    path: path.resolve(__dirname, 'lib/web/esm'),
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
  },
};

module.exports = [cjsNodeConfig, esmNodeConfig, esmWebConfig, cjsWebConfig];
