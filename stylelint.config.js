const physicalDirectionProperties = [
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'border-left',
  'border-right',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'left',
  'right',
];

export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['src/styles/tokens.css'],
  rules: {
    'color-no-hex': true,
    'import-notation': 'string',
    'custom-property-pattern': '^[a-z][a-z0-9-]*$',
    'selector-id-pattern': '^[a-z][a-zA-Z0-9-]*$',
    'property-disallowed-list': physicalDirectionProperties,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'utility',
          'variant',
          'custom-variant',
          'source',
          'config',
          'plugin',
          'reference',
        ],
      },
    ],
  },
};
