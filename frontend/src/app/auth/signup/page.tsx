import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Join Heard</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          It takes 60 seconds to contact every official who represents you
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
