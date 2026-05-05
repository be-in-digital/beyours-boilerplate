import { StyleSheet, Text, View } from "react-native"

/**
 * Placeholder home screen.
 *
 * The mobile app is a customer-facing companion for the BeInDigital
 * restaurant SaaS — it consumes the same Convex backend as the web
 * storefront via `@repo/backend`. Authentication uses Better Auth in
 * bearer-token mode (`@better-auth/expo` + `expo-secure-store`).
 *
 * Replace this screen with the real home / catalogue / cart flows
 * when starting a real client mobile project. See `apps/mobile/README.md`.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BeInDigital</Text>
      <Text style={styles.subtitle}>Mobile placeholder</Text>
      <Text style={styles.body}>
        Edit `apps/mobile/app/index.tsx` to build your customer app.
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
