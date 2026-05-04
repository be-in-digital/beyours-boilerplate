"use client"

import { useState } from "react"
import { AlertTriangle, X, ChevronDown, ChevronRight, Copy, Check } from "lucide-react"
import type { MissingEnvVar } from "@/lib/env-config"

function groupByCategory(vars: MissingEnvVar[]) {
  const groups: Record<string, MissingEnvVar[]> = {}
  for (const v of vars) {
    if (!groups[v.group]) groups[v.group] = []
    groups[v.group].push(v)
  }
  return groups
}

function EnvSnippet({ vars }: { vars: MissingEnvVar[] }) {
  const [copied, setCopied] = useState(false)

  const snippet = vars.map((v) => `${v.name}=`).join("\n")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative mt-4 rounded-xl bg-zinc-900 p-4 text-sm font-mono">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
        title="Copier"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="text-zinc-300 overflow-x-auto whitespace-pre-wrap pr-10">
        {vars.map((v) => (
          <span key={v.name}>
            <span className="text-zinc-500"># {v.description}</span>
            {"\n"}
            <span className={v.required ? "text-red-400" : "text-yellow-400"}>{v.name}</span>
            =
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  )
}

function GroupSection({ group, vars }: { group: string; vars: MissingEnvVar[] }) {
  const [open, setOpen] = useState(true)
  const requiredCount = vars.filter((v) => v.required).length

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
          <span className="font-semibold text-zinc-800">{group}</span>
          <span className="text-xs text-zinc-500">
            {vars.length} variable{vars.length > 1 ? "s" : ""}
          </span>
        </div>
        {requiredCount > 0 && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            {requiredCount} requise{requiredCount > 1 ? "s" : ""}
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2">
          {vars.map((v) => (
            <div key={v.name} className="flex items-start gap-3 py-1.5">
              <span
                className={`mt-0.5 inline-block h-2 w-2 rounded-full shrink-0 ${
                  v.required ? "bg-red-500" : "bg-yellow-400"
                }`}
              />
              <div className="min-w-0">
                <code className="text-sm font-semibold text-zinc-800">{v.name}</code>
                <p className="text-xs text-zinc-500 mt-0.5">{v.description}</p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                  v.required ? "text-red-600" : "text-yellow-600"
                }`}
              >
                {v.required ? "requise" : "optionnelle"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EnvCheckDialog({ missingVars }: { missingVars: MissingEnvVar[] }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || missingVars.length === 0) return null

  const grouped = groupByCategory(missingVars)
  const requiredMissing = missingVars.filter((v) => v.required)
  const optionalMissing = missingVars.filter((v) => !v.required)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Variables d&apos;environnement manquantes
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {requiredMissing.length > 0 ? (
                  <>
                    <span className="font-semibold text-red-600">{requiredMissing.length} requise{requiredMissing.length > 1 ? "s" : ""}</span>
                    {optionalMissing.length > 0 && (
                      <> et <span className="font-semibold text-yellow-600">{optionalMissing.length} optionnelle{optionalMissing.length > 1 ? "s" : ""}</span></>
                    )}
                  </>
                ) : (
                  <span className="font-semibold text-yellow-600">{optionalMissing.length} optionnelle{optionalMissing.length > 1 ? "s" : ""}</span>
                )}
                {" "}&mdash; ajoutez-les dans <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-semibold">.env.local</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {Object.entries(grouped).map(([group, vars]) => (
            <GroupSection key={group} group={group} vars={vars} />
          ))}

          {/* Snippet a copier */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Snippet a ajouter dans .env.local
            </p>
            <EnvSnippet vars={missingVars} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Ce dialogue n&apos;apparait qu&apos;en mode developpement
          </p>
          <button
            onClick={() => setDismissed(true)}
            className="px-5 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  )
}
