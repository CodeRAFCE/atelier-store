import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account.",
};

export default function SignInPage() {
  return <AuthPage mode="sign-in" title="Welcome back" />;
}
