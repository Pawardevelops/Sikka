module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        overrides: [
            {
                // WatermelonDB models (.ts) use legacy decorators on `field!:` declarations.
                // Strip TypeScript first so the decorators plugin never sees `!` fields
                // (otherwise the web bundle fails with "Definitely assigned fields...").
                test: /\.ts$/,
                plugins: [
                    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
                    ['@babel/plugin-proposal-decorators', { legacy: true }],
                    ['@babel/plugin-transform-class-properties', { loose: true }],
                ],
            },
        ],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./'],
                    alias: {
                        '@': './src',
                        '@components': './src/components',
                        '@screens': './src/screens',
                        '@navigation': './src/navigation',
                        '@services': './src/services',
                        '@hooks': './src/hooks',
                        '@utils': './src/utils',
                        '@types': './src/types',
                        '@constants': './src/constants',
                        '@context': './src/context',
                        '@assets': './assets',
                    },
                },
            ],
        ],
    };
};
