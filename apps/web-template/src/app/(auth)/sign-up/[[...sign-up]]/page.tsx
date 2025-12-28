import { SignUp } from '@startkit/auth'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
      />
    </div>
  )
}
