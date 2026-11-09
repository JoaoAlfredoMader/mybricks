import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { contractTemplateQueryOptions } from '@/features/contracts/api/template'
import { ContractTemplatePage } from '@/features/contracts/components/contract-template-page'

export const Route = createFileRoute('/_authenticated/app/contratos/modelo')({
  // Always the stored version: the editor must not start from a stale copy.
  loader: ({ context: { queryClient } }) => queryClient.fetchQuery({ ...contractTemplateQueryOptions, staleTime: 0 }),
  component: ContractTemplateRoute,
})

export function ContractTemplateRoute() {
  const { session } = Route.useRouteContext()
  const template = useSuspenseQuery(contractTemplateQueryOptions).data
  const canEdit = session.memberRole === 'owner' || session.memberRole === 'admin'
  return <ContractTemplatePage template={template} canEdit={canEdit} canReset={canEdit && session.impersonatedById === null} />
}
