import { SignInForm } from "@/components/SignInForm";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <SignInForm />;
  }

  return <StudyWorkspace email={user.email ?? "Signed-in student"} />;
}
