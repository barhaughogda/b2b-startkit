import { ProviderLayout } from "@/components/provider/ProviderLayout"

export default function ProviderPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProviderLayout>
      {children}
    </ProviderLayout>
  )
}
