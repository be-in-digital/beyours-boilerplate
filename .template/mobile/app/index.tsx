import { StyleSheet, Text, View } from "react-native"

/**
 * Placeholder home screen.
 *
 * The mobile app is the customer companion to the web storefront: it talks to
 * the SAME Convex backend (EXPO_PUBLIC_CONVEX_URL, filled into mobile/.env by
 * `pnpm setup` / `pnpm add:mobile`). Authentication uses Better Auth in bearer
 * token mode (`@better-auth/expo` + `expo-secure-store`) — the same Better
 * Auth instance as the web app, which uses cookies instead.
 *
 * Replace this screen with the real flows (catalog / cart / loyalty) when
 * starting an actual client mobile project. See mobile/README.md.
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
