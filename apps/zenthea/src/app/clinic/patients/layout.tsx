// Force dynamic rendering - child pages use ClinicLayout which includes CardControlBar requiring CardSystemProvider context
export const dynamic = 'force-dynamic';

export default function PatientsLayout({
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

