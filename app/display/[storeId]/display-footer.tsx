"use client"

interface DisplayFooterProps {
  storeSlug: string
}

export function DisplayFooter({ storeSlug }: DisplayFooterProps) {
  return (
    <footer className="px-8 py-3 flex items-center justify-between text-sm text-slate-500">
      <span>{storeSlug}</span>
      <span>Powered by Be In Digital</span>
    </footer>
  )
}
