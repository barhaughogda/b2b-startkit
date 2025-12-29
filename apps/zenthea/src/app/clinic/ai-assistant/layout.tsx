// Force dynamic rendering - child pages use ClinicLayout
export const dynamic = 'force-dynamic';

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}

