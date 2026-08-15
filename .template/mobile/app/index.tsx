import { StyleSheet, Text, View } from "react-native"

/**
 * Écran d'accueil placeholder.
 *
 * L'app mobile est le compagnon client du storefront web : elle consomme le
 * MÊME backend Convex (EXPO_PUBLIC_CONVEX_URL, renseignée dans mobile/.env
 * par `pnpm setup` / `pnpm add:mobile`). L'authentification utilise Better
 * Auth en mode bearer token (`@better-auth/expo` + `expo-secure-store`) —
 * la même instance Better Auth que le web (qui, lui, est en cookies).
 *
 * Remplacer cet écran par les vrais flux (catalogue / panier / fidélité)
 * au démarrage d'un vrai projet mobile client. Voir mobile/README.md.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BeYours</Text>
      <Text style={styles.subtitle}>App mobile — placeholder</Text>
      <Text style={styles.body}>
        Éditez mobile/app/index.tsx pour construire l&apos;app cliente.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  body: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
  },
})
