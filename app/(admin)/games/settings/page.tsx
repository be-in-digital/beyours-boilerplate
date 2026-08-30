// DELIBERATE DIVERGENCE from apps/reference — do not align.
// The bench sends this legacy path to /dashboard/games because it deleted
// /dashboard/games/settings. That route exists here, so the redirect keeps
// its original destination.
import { redirect } from "next/navigation"

export default function Page() {
  redirect("/dashboard/games/settings")
}
