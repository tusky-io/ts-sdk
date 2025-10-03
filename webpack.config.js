const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const pkg = require('./package.json');
const version = pkg.version;

const commonNodeConfig = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.node.cjs.json" })],
    alias: {
      '@env/types': path.resolve(__dirname, 'src/types/node'),
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
              configFile: 'tsconfig.node.cjs.json',
              compiler: 'ts-patch/compiler',
              transpileOnly: false
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
  resolve: {
    ...commonNodeConfig.resolve,
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.node.esm.json" })],
  },
  module: {
    ...commonNodeConfig.module,
    rules: [
      {
        ...commonNodeConfig.module.rules[0],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.node.esm.json',
              compiler: 'ts-patch/compiler',
              transpileOnly: false
            },
          }
        ],
      },
    ],
  },
  optimization: {
    ...commonNodeConfig.optimization,
    moduleIds: 'named',
    chunkIds: 'named',
  },
  externals: [
    nodeExternals({
      importType: 'module',
      modulesDir: path.resolve(__dirname, 'node_modules'),
    }),
  ],
};

const commonWebConfig = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'web',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.web.cjs.json" })],
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
              configFile: 'tsconfig.web.cjs.json',
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

const cjsWebConfig = {
  ...commonWebConfig,
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'lib/web/cjs'),
    library: {
      type: 'commonjs2',
    },
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
  resolve: {
    ...commonWebConfig.resolve,
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.web.esm.json" })],
  },
  module: {
    ...commonWebConfig.module,
    rules: [
      {
        ...commonWebConfig.module.rules[0],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.web.esm.json',
              compiler: 'ts-patch/compiler'
            },
          }
        ],
      },
    ],
  },
  optimization: {
    ...commonWebConfig.optimization,
    moduleIds: 'named',
    chunkIds: 'named',
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

const commonReactNativeConfig = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'web',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.react-native.cjs.json" })],
    alias: {
      '@env/types': path.resolve(__dirname, 'src/types/react-native'),
      '@env/core': path.resolve(__dirname, 'src/core/react-native'),
    }
  },
  externals: {
    'react-native': 'react-native',
    'react-native-blob-util': 'react-native-blob-util',
    'react-native-libsodium': 'react-native-libsodium',
    'expo-file-system': 'expo-file-system',
    'react-native-fs': 'react-native-fs'

  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.react-native.cjs.json',
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

const cjsReactNativeConfig = {
  ...commonReactNativeConfig,
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'lib/react-native/cjs'),
    library: {
      type: 'commonjs2',
    },
  },
};

const esmReactNativeConfig = {
  ...commonReactNativeConfig,
  output: {
    filename: 'index.esm.js',
    path: path.resolve(__dirname, 'lib/react-native/esm'),
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    ...commonReactNativeConfig.resolve,
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.react-native.esm.json" })],
  },
  module: {
    ...commonReactNativeConfig.module,
    rules: [
      {
        ...commonReactNativeConfig.module.rules[0],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.react-native.esm.json',
              compiler: 'ts-patch/compiler'
            },
          }
        ],
      },
    ],
  },
  optimization: {
    ...commonReactNativeConfig.optimization,
    moduleIds: 'named',
    chunkIds: 'named',
  },
};

module.exports = (env, argv) => {
  const configs = [];
  if (process.env.STATS === 'server') {
    configs.push(cjsNodeConfig, esmNodeConfig, cjsWebConfig, esmWebConfig, cjsReactNativeConfig, esmReactNativeConfig);
    configs.forEach(config => {
      config.plugins.push(new WebpackBundleAnalyzer({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
      }));
    });
  } else {
    configs.push(
      cjsNodeConfig,
      esmNodeConfig,
      cjsWebConfig,
      esmWebConfig,
      cjsReactNativeConfig,
      esmReactNativeConfig,
      serviceWorkerWebConfig
    );
  }

  return configs;
};