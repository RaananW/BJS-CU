const path = require('path');
const webpack = require('webpack');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
    context: path.resolve(__dirname, './src'),
    entry: {
        'babylonjs-gui': path.resolve(__dirname, './src/legacy/legacy.ts'),
    },
    output: {
        path: path.resolve(__dirname, '../dist/preview release/gui'),
        filename: 'babylon.gui.min.js',
        libraryTarget: 'umd',
        library: {
            root: ["BABYLON", "GUI"],
            amd: "babylonjs-gui",
            commonjs: "babylonjs-gui"
        },
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".ts"]
    },
    externals: [
        {
            babylonjs: {
                root: "BABYLON",
                commonjs: "babylonjs",
                commonjs2: "babylonjs",
                amd: "babylonjs"
            }
        },
        /^babylonjs.*$/i
    ],
    devtool: "source-map",
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: 'awesome-typescript-loader',
            options: {
                configFileName: '../../gui/tsconfig.json',
                declaration: false
            }
        }]
    },
    mode: "production",
    devServer: {
        contentBase: path.join(__dirname, "dist"),
        compress: false,
        //open: true,
        port: 9000
    },
    plugins: [
        new HardSourceWebpackPlugin(),
        new webpack.WatchIgnorePlugin([
            /\.js$/,
            /\.d\.ts$/,
            /\.fx$/
        ])
    ],
    watchOptions: {
        ignored: [path.resolve(__dirname, './dist/**/*.*'), 'node_modules']
    }
}