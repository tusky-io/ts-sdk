const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer")
    .BundleAnalyzerPlugin;
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const webpack = require('webpack');

const package = require('./package.json');
const version = package.version;

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
  plugins: [
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
    }),
  ]
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
      '@env/core': path.resolve(__dirname, 'src/core/web'),
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
        exclude: [/node_modules/, /worker\.js$/],
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
  plugins: [
    new WebpackBundleAnalyzer({
        analyzerMode: process.env.STATS || 'disabled',
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
    }),
    // new ProvidePlugin({
    //     Buffer: ['buffer', 'Buffer'],
    // }),
    // new NodePolyfillPlugin({
    //     excludeAliases: ['console']
    // }),
    // new CopyWebpackPlugin({
    //     patterns: [
    //         { from: 'static' }
    //     ]
    // })
]
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

const serviceWorkerWebConfig = {
  mode: 'development',

  entry: './src/core/web/worker.js',

  output: {
      filename: 'worker.min.js',
      path: path.resolve(__dirname, 'lib/web/sw'),
  },

  plugins: [
      new CopyWebpackPlugin({
          patterns: [
              {
                  from: path.resolve(__dirname, './src/core/web/worker.js'),
                  to: path.resolve(__dirname, 'lib/web/sw'),
              },
          ],
      }),
  ],
};

module.exports = [cjsWebConfig, esmWebConfig, serviceWorkerWebConfig, cjsNodeConfig, esmNodeConfig];