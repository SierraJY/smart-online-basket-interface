import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 특정 규칙 끄기
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // any 타입 허용
      "react/no-unescaped-entities": "off",        // 따옴표 문자 그대로 허용
    },
  },
];

export default eslintConfig;

