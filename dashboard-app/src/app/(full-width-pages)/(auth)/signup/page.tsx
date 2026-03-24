import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ransight SignUp",
  description: "Ransight SignUp Page",
};


export default function SignUp() {
  return <SignUpForm />;
}
