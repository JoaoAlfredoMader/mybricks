import { Eye } from 'lucide-react'
import { useStopImpersonating } from '@/features/auth/hooks/use-auth-actions'

/**
 * Shown while a platform admin acts as another user. The API refuses every DELETE in
 * this state, so the banner stays on top of every screen.
 */
export function ImpersonationBanner({ userName, onStopped }: { userName: string; onStopped: () => void }) {
  const stop = useStopImpersonating()

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-orange-500 px-4 py-2 text-sm font-medium text-white">
      <span className="inline-flex items-center gap-2">
        <Eye className="size-4" aria-hidden="true" />
        Você está vendo o sistema como {userName}. Exclusões ficam bloqueadas.
      </span>
      <button
        type="button"
        onClick={() => stop.mutate(undefined, { onSuccess: onStopped })}
        disabled={stop.isPending}
        className="rounded-md bg-white/15 px-2.5 py-0.5 font-semibold hover:bg-white/25 disabled:opacity-60"
      >
        {stop.isPending ? 'Saindo…' : 'Voltar para minha conta'}
      </button>
    </div>
  )
}
