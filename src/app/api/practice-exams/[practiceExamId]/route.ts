import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ practiceExamId: string }> }) {
  const { practiceExamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before deleting a practice paper." }, { status: 401 });
  }

  const { data: practiceExam, error: lookupError } = await supabase
    .from("practice_exams")
    .select("id, title")
    .eq("id", practiceExamId)
    .maybeSingle();

  if (lookupError || !practiceExam) {
    return NextResponse.json({ error: "We couldn't find that practice paper in your workspace." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("practice_exams")
    .delete()
    .eq("id", practiceExam.id);

  if (deleteError) {
    return NextResponse.json({ error: "We couldn't delete that practice paper. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ deletedPracticeExamId: practiceExam.id, title: practiceExam.title });
}
