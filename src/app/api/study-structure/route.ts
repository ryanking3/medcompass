import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_NAME_LENGTH = 140;
const MAX_OBJECTIVE_LENGTH = 1_000;

function textField(value: unknown, maximumLength = MAX_NAME_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before creating a topic." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The topic details were incomplete. Please try again." }, { status: 400 });
  }

  const courseName = textField(body.courseName);
  const moduleName = textField(body.moduleName);
  const topicName = textField(body.topicName);
  const learningObjective = textField(body.learningObjective, MAX_OBJECTIVE_LENGTH);

  if (!courseName || !moduleName || !topicName) {
    return NextResponse.json({ error: "Please add a course, module, and topic name." }, { status: 400 });
  }

  const { data: existingWorkspace, error: workspaceLookupError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (workspaceLookupError) {
    return NextResponse.json({ error: "We couldn't prepare your study workspace." }, { status: 500 });
  }

  let workspaceId = existingWorkspace?.id;
  if (!workspaceId) {
    const { data: workspace, error: workspaceCreateError } = await supabase
      .from("workspaces")
      .insert({ owner_id: user.id })
      .select("id")
      .single();

    if (workspaceCreateError || !workspace) {
      return NextResponse.json({ error: "We couldn't create your study workspace." }, { status: 500 });
    }

    workspaceId = workspace.id;
  }

  const { data: matchingCourse, error: courseLookupError } = await supabase
    .from("courses")
    .select("id, name, institution, programme, academic_year")
    .eq("workspace_id", workspaceId)
    .eq("name", courseName)
    .maybeSingle();

  if (courseLookupError) {
    return NextResponse.json({ error: "We couldn't find that course in your workspace." }, { status: 500 });
  }

  let course = matchingCourse;
  if (!course) {
    const { data: createdCourse, error: courseCreateError } = await supabase
      .from("courses")
      .insert({ workspace_id: workspaceId, name: courseName })
      .select("id, name, institution, programme, academic_year")
      .single();

    if (courseCreateError || !createdCourse) {
      return NextResponse.json({ error: "We couldn't create that course. Please try again." }, { status: 500 });
    }
    course = createdCourse;
  }

  const { data: matchingModule, error: moduleLookupError } = await supabase
    .from("modules")
    .select("id, course_id, name")
    .eq("course_id", course.id)
    .eq("name", moduleName)
    .maybeSingle();

  if (moduleLookupError) {
    return NextResponse.json({ error: "We couldn't find that module in your workspace." }, { status: 500 });
  }

  let studyModule = matchingModule;
  if (!studyModule) {
    const { count } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id);
    const { data: createdModule, error: moduleCreateError } = await supabase
      .from("modules")
      .insert({ workspace_id: workspaceId, course_id: course.id, name: moduleName, sort_order: count ?? 0 })
      .select("id, course_id, name")
      .single();

    if (moduleCreateError || !createdModule) {
      return NextResponse.json({ error: "We couldn't create that module. Please try again." }, { status: 500 });
    }
    studyModule = createdModule;
  }

  const { data: matchingTopic, error: topicLookupError } = await supabase
    .from("topics")
    .select("id")
    .eq("module_id", studyModule.id)
    .eq("name", topicName)
    .maybeSingle();

  if (topicLookupError) {
    return NextResponse.json({ error: "We couldn't check your topics. Please try again." }, { status: 500 });
  }
  if (matchingTopic) {
    return NextResponse.json({ error: "That topic already exists in this module." }, { status: 409 });
  }

  const { count: topicCount } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("module_id", studyModule.id);
  const { data: topic, error: topicCreateError } = await supabase
    .from("topics")
    .insert({ workspace_id: workspaceId, module_id: studyModule.id, name: topicName, sort_order: topicCount ?? 0 })
    .select("id, module_id, name, description, last_studied_at")
    .single();

  if (topicCreateError || !topic) {
    return NextResponse.json({ error: "We couldn't create that topic. Please try again." }, { status: 500 });
  }

  let objectives: { id: string; body: string }[] = [];
  if (learningObjective) {
    const { data: objective, error: objectiveError } = await supabase
      .from("learning_objectives")
      .insert({ workspace_id: workspaceId, topic_id: topic.id, body: learningObjective })
      .select("id, body")
      .single();

    if (objectiveError || !objective) {
      return NextResponse.json({ error: "Your topic was created, but we couldn't save its learning objective." }, { status: 500 });
    }
    objectives = [objective];
  }

  return NextResponse.json({
    createdTopic: {
      course: {
        id: course.id,
        name: course.name,
        institution: course.institution,
        programme: course.programme,
        academicYear: course.academic_year,
      },
      module: { id: studyModule.id, courseId: studyModule.course_id, name: studyModule.name },
      topic: {
        id: topic.id,
        moduleId: topic.module_id,
        name: topic.name,
        description: topic.description,
        lastStudiedAt: topic.last_studied_at,
        learningObjectives: objectives,
      },
    },
  }, { status: 201 });
}
