/**
 * Config ESLint flat minimale pour le placeholder Expo.
 *
 * Quand l'app mobile démarre vraiment, remplacer par la config Expo
 * complète :
 *
 *   import expoConfig from "eslint-config-expo/flat.js"
 *   export default expoConfig
 */
export default [
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**"],
  },
]
