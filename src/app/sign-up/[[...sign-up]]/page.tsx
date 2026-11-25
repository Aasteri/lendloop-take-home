import { SignUp } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { hasLiveClerk } from "@/lib/config";
import { KeysNeeded } from "@/components/KeysNeeded";

export default function SignUpPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-16">
        {hasLiveClerk() ? (
          <SignUp afterSignInUrl="/browse" afterSignUpUrl="/browse" />
        ) : (
          <KeysNeeded action="You can create an account" />
        )}
      </main>
    </>
  );
}
