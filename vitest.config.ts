import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'sh-text',
      transform(code, id) {
        if (id.endsWith('.sh')) {
          return { code: `export default ${JSON.stringify(code)}` }
        }
      },
    },
  ],
})
