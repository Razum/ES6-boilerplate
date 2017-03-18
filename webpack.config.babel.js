import path from 'path';
import webpack from 'webpack';

const getPlugins = (isDev) => {
    // define free variables
    const GLOBALS = {
        __DEV__: !!isDev
    };

    const plugins = [
        new webpack.DefinePlugin(GLOBALS)
    ];

    if (!isDev) {
        plugins.push(new webpack.optimize.DedupePlugin());
        plugins.push(new webpack.optimize.UglifyJsPlugin({sourceMap: false}));
    }

    return plugins;
};

const getLoaders = (isDev) => {
    return [
        {
            test: /\.jsx?$/,
            loader: 'babel-loader',
            exclude: /(node_modules|bower_components)/,
        }
    ];
};

export default (config) => {
    return {
        entry: config.scripts.src,
        output: {
            path: path.resolve(__dirname, config.scripts.dest),
            filename: '[name].js'
        },
        resolve: {
            extensions: ['.js', '.jsx', '.json']
        },
        devtool: "#inline-source-map",
        module: {
            rules: getLoaders(config.dev)
        },
        plugins: getPlugins(config.dev),
    };
}