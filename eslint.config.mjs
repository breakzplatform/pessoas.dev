import nextVitals from "eslint-config-next/core-web-vitals"
import prettier from "eslint-config-prettier"

const config = [
  ...nextVitals,
  prettier,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "dist/**",
      ".cache/**",
      "*.esm.js",
    ],
  },
]

export default config
