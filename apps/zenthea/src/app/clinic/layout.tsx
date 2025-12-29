// Force dynamic rendering - clinic pages use ClinicLayout which includes navigation requiring session context
export const dynamic = 'force-dynamic';

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

