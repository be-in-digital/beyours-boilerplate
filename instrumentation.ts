export async function register() {
  // Skip validation during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  const { validateAllEnv, formatEnvReport } = await import(
    '@be-in-digital/core/env'
  )

  const { ok, missing } = validateAllEnv()

  if (ok) {
    console.log('[env] All environment variables validated successfully')
    return
  }

  const report = formatEnvReport(missing)
  console.error(report)

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[env] ${missing.length} environment variable(s) missing or invalid. See report above.`
    )
  }
}
