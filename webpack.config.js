const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './background.js',
        popup: './popup.js',
        content: './content.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'), // Keep everything inside "dist/"
        filename: '[name].bundle.js', // Outputs background.bundle.js, popup.bundle.js, content.bundle.js in dist/
    },
    mode: 'production',
    devtool: 'source-map',  // Enable source maps for debugging
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'manifest.json', to: '.' },   // Copy to dist/
                { from: 'popup.html', to: '.' },      // Copy to dist/
                { from: 'logo2.png', to: '.' }        // Copy to dist/
            ]
        })
    ],
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/i,
                type: 'asset/resource',
                generator: {
                    filename: '[name][ext]', // Keep original file name in dist/
                },
            }
        ],
    },
    optimization: {
        minimize: true,  // Enable JS minification
        minimizer: ['...'], // Use default TerserPlugin
    }
};
