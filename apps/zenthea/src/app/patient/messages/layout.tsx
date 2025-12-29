// Force dynamic rendering - child pages use useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

export default function PatientMessagesLayout({
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

