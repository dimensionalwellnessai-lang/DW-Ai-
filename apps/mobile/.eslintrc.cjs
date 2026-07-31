module.exports = {
  extends: ['expo'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../client/*', '../client/*', '@web/*'],
            message: 'Mobile code must not import web-only modules.',
          },
          {
            group: ['../../server/*', '../server/*'],
            message: 'Mobile code must not import server-only modules.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../client/*', '../client/*', '@web/*'],
                message: 'Shared mobile modules must stay platform-safe.',
              },
              {
                group: ['../../server/*', '../server/*'],
                message: 'Mobile code must not import server-only modules.',
              },
            ],
          },
        ],
      },
    },
  ],
};
