import { getPlans } from "@/lib/services/members";
import { SignUpForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const plans = await getPlans();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6">
      <SignUpForm plans={plans} />
    </div>
  );
}
