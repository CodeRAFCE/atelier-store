import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account.",
};

export default function SignUpPage() {
  return <AuthPage
      mode="sign-up" title="Create an account"
      intro="It only takes a minute."
    />;
}
