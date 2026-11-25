import { SignIn } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { hasLiveClerk } from "@/lib/config";
import { KeysNeeded } from "@/components/KeysNeeded";

export default function SignInPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-16">
        {hasLiveClerk() ? (
          <SignIn afterSignInUrl="/browse" afterSignUpUrl="/browse" />
        ) : (
          <KeysNeeded action="You can sign in" />
        )}
      </main>
    </>
  );
}
