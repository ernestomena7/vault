import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'Vault Design System/**',
      // Synced verbatim from the design system — owned there, not here.
      'src/components/ds/**',
    ],
  },

  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  /**
   * Constitution III: the storage provider lives behind one module boundary.
   *
   * The Dropbox SDK is importable ONLY by the adapter that implements the port.
   * If this rule ever needs an exception, the boundary has been lost and the
   * move to GCP has become a rewrite. tests/integration/constitution.test.ts
   * asserts the same thing, so the guarantee survives a lint misconfiguration.
   */
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,mjs}', 'tests/**/*.ts'],
    ignores: ['src/lib/storage/dropbox/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dropbox',
              message:
                'Import the storage port from @/lib/storage/port instead. The Dropbox SDK may only be imported by src/lib/storage/dropbox/ (Constitution III).',
            },
          ],
        },
      ],
    },
  },

  // Tests reach into internals deliberately to arrange fixtures.
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
