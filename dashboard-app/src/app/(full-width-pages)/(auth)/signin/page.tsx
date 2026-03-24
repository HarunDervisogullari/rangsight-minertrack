import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ransight SignIn",
  description: "Ransight Signin Page",
};

export default function SignIn() {
  return <SignInForm />;
}
