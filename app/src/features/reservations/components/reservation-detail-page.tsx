import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Ban, Pencil } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DetailCard } from '@/components/detail-card'
import { buttonVariants, Button } from '@/components/ui/button'
import { contractQueryOptions } from '@/features/contracts/api/queries'
import { contractPeriod } from '@/features/contracts/lib/period'
import { formatDate, formatDocument, formatMoney, formatPhone } from '@/lib/format'
import type { Reservation } from '../api/queries'
import { useCancelReservation } from '../hooks/use-reservation-mutations'
import { reservationErrorMessage } from '../lib/reservation-form'
import { formatNights } from '../lib/labels'
import { ReservationStatusBadge } from './reservation-status-badge'

function CancelReservationButton({ reservation }: { reservation: Reservation }) {
  const cancel = useCancelReservation(reservation.id)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="lg" className="h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Ban aria-hidden="true" />
          Cancelar reserva
        </Button>
      }
      title="Cancelar esta reserva?"
      description="As noites ficam livres para outra reserva. A reserva continua registrada como cancelada e não volta a ficar confirmada."
      confirmLabel="Cancelar reserva"
      pendingLabel="Cancelando…"
      cancelLabel="Voltar"
      onConfirm={() => cancel.mutateAsync()}
      errorMessage={(error) => reservationErrorMessage(error, 'Não foi possível cancelar agora. Tente de novo.')}
    />
  )
}

/** The short-stay contract the reservation is linked to, named by its occupant and term. */
function LinkedContract({ contractId }: { contractId: string }) {
  const contract = useQuery(contractQueryOptions(contractId)).data
  return (
    <Link
      to="/app/contratos/$contractId"
      params={{ contractId }}
      className="underline-offset-4 hover:underline"
    >
      {contract ? `${contract.occupant.name} · ${contractPeriod(contract)}` : 'Ver contrato'}
    </Link>
  )
}

export function ReservationDetailPage({ reservation }: { reservation: Reservation }) {
  const { guest } = reservation
  const confirmed = reservation.status === 'confirmed'

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        to="/app/reservas"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Reservas
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Reserva de temporada</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{guest.name}</h1>
          <p className="mt-1 text-sm">
            <Link
              to="/app/imoveis/$propertyId"
              params={{ propertyId: reservation.propertyId }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {reservation.propertyName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-card px-3.5 py-2 text-sm">
            <ReservationStatusBadge status={reservation.status} />
          </span>
          {confirmed && (
            <>
              <CancelReservationButton reservation={reservation} />
              <Link
                to="/app/reservas/$reservationId/editar"
                params={{ reservationId: reservation.id }}
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
              >
                <Pencil aria-hidden="true" />
                Editar
              </Link>
            </>
          )}
        </div>
      </header>

      {!confirmed && (
        <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Esta reserva foi cancelada e não pode mais ser alterada. As noites estão livres.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DetailCard
          title="Hóspede"
          items={[
            { label: 'Nome', value: guest.name },
            { label: 'CPF ou CNPJ', value: guest.document && formatDocument(guest.document) },
            {
              label: 'E-mail',
              value: guest.email && (
                <a href={`mailto:${guest.email}`} className="underline-offset-4 hover:underline">
                  {guest.email}
                </a>
              ),
            },
            { label: 'Telefone', value: guest.phone && formatPhone(guest.phone) },
          ]}
        />
        <DetailCard
          title="Estadia"
          items={[
            { label: 'Entrada', value: formatDate(reservation.checkIn) },
            { label: 'Saída', value: formatDate(reservation.checkOut) },
            { label: 'Noites', value: formatNights(reservation.nights) },
            { label: 'Valor total', value: formatMoney(reservation.totalAmountCents) },
            { label: 'Contrato', value: reservation.contractId ? <LinkedContract contractId={reservation.contractId} /> : 'Sem contrato ligado' },
          ]}
        />
        {reservation.notes && (
          <DetailCard title="Observações">
            <p className="mt-3 text-sm whitespace-pre-line">{reservation.notes}</p>
          </DetailCard>
        )}
      </div>
    </main>
  )
}
