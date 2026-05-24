import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/90 px-8 py-10 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-stone-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Pick up where you left off
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
