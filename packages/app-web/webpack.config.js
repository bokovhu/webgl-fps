const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const PnpWebpackPlugin = require("pnp-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (_env) => {
    const env = _env || {};
    return {
        entry: {
            web: path.resolve(process.cwd(), "./src/index.js"),
        },
        output: {
            path: path.resolve(process.cwd(), "../../dist"),
            filename: "[name].bundle.js",
        },
        devtool:
            env.NODE_ENV === "development" ? "inline-source-map" : undefined,
        module: {
            rules: [
                {
                    test: /\.(js|ts)$/,
                    use: [
                        {
                            loader: require.resolve("babel-loader"),
                            options: {
                                plugins: [
                                    `@babel/plugin-transform-modules-commonjs`,
                                    `@babel/plugin-proposal-optional-chaining`,
                                    `@babel/plugin-proposal-nullish-coalescing-operator`,
                                ],
                                presets: ["@babel/preset-typescript"],
                                ignore: [`**/*.d.ts`],
                            },
                        },
                    ],
                },
                {
                    test: /\.s[ac]ss$/,
                    use: [
                        require.resolve("style-loader"),
                        require.resolve("css-loader"),
                        {
                            loader: require.resolve("sass-loader"),
                            options: {
                                implementation: require("dart-sass"),
                            },
                        },
                    ],
                },
                /* {
                    test: /\.worker\.js$/,
                    use: [
                        {
                            loader: require.resolve("awesome-worker-loader"),
                            options: {
                                fallback: false,
                                inline: false,
                            },
                        },
                    ],
                }, */
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.resolve(process.cwd(), "src/index.html"),
            }),
        ],
        devServer: {
            port: 3000,
        },
        resolve: {
            plugins: [PnpWebpackPlugin],
        },
        resolveLoader: {
            plugins: [PnpWebpackPlugin.moduleLoader(module)],
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    cache: true,
                    parallel: true,
                    sourceMap: env.NODE_ENV === "development",
                }),
            ],
        },
    };
};
