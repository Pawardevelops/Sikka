module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
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
