import { config } from "@pigment/eslint-config/base";

export default [
  ...config,
  {
    rules: {
      "no-control-regex": "off",
      "turbo/no-undeclared-env-vars": "off",
    },
  },
];
