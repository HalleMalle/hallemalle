import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'

export default [
  // JS 기본 권장
  js.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      // React Refresh (Vite HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 코드 품질
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // Prettier 충돌 규칙 비활성화
  prettierConfig,
]