import { Clock } from "lucide-react"

interface ComingSoonProps {
  title: string
  description?: string
}

/**
 * ComingSoon component
 * Displays a placeholder for features under development
 */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-md">
          {description ?? "Cette fonctionnalité arrive bientôt. Restez à l'écoute !"}
        </p>
      </div>
    </div>
  )
}
