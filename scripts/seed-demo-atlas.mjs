import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoEmail = process.env.DEMO_USER_EMAIL;
const resetConfirmation = process.env.DEMO_SEED_CONFIRM;

if (!supabaseUrl || !serviceRoleKey || !demoEmail) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_USER_EMAIL.");
  process.exit(1);
}

if (resetConfirmation !== "reset-demo-workspace") {
  console.error("Refusing to seed without DEMO_SEED_CONFIRM=reset-demo-workspace.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function addDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function must(label, operation) {
  const result = await operation;
  if (result.error) {
    console.error(`${label} failed:`, result.error.message);
    process.exit(1);
  }
  return result.data;
}

async function findUserByEmail(email) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.error("Could not list auth users:", error.message);
      process.exit(1);
    }
    const user = data.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) break;
    page += 1;
  }
  return null;
}

async function insertRows(table, rows) {
  if (!rows.length) return [];
  return must(`insert ${table}`, supabase.from(table).insert(rows).select("*"));
}

const user = await findUserByEmail(demoEmail);
if (!user) {
  console.error(`No Supabase auth user found for ${demoEmail}. Sign into the app with that email first, then rerun this script.`);
  process.exit(1);
}

await must("upsert profile", supabase.from("profiles").upsert({ id: user.id, full_name: "Demo Student" }).select("id").single());

let workspace = await must("lookup workspace", supabase
  .from("workspaces")
  .select("id")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle());

if (!workspace) {
  workspace = await must("create workspace", supabase.from("workspaces").insert({ owner_id: user.id, name: "Demo study workspace" }).select("id").single());
}

const workspaceId = workspace.id;

const resetTables = [
  "note_images",
  "note_citations",
  "flashcards",
  "flashcard_decks",
  "study_plan_blocks",
  "study_exam_topics",
  "study_exams",
  "study_availability_rules",
  "document_topics",
  "document_pages",
  "documents",
  "notes",
  "learning_objectives",
  "topics",
  "modules",
  "courses",
];

for (const table of resetTables) {
  await must(`reset ${table}`, supabase.from(table).delete().eq("workspace_id", workspaceId));
}

const [course] = await insertRows("courses", [{
  workspace_id: workspaceId,
  name: "Graduate Entry Medicine — Demo",
  institution: "MedCompass Demo University",
  programme: "GEM",
  academic_year: "Year 2",
}]);

const moduleSpecs = [
  {
    key: "cardio",
    name: "Cardiovascular System",
    topics: [
      ["cardiac-cycle", "Cardiac cycle", "Explain pressure, volume, valve, and heart sound changes across systole and diastole."],
      ["ecg", "ECG basics", "Connect waveforms, intervals, and conduction pathways to common rhythm interpretation."],
      ["haemodynamics", "Haemodynamics", "Relate pressure gradients, resistance, compliance, and flow in systemic circulation."],
      ["heart-failure", "Heart failure physiology", "Compare preload, afterload, contractility, and compensation in heart failure."],
    ],
  },
  {
    key: "resp",
    name: "Respiratory System",
    topics: [
      ["ventilation", "Pulmonary ventilation", "Describe lung volumes, compliance, airway resistance, and work of breathing."],
      ["gas-exchange", "Gas exchange", "Explain diffusion limits, V/Q matching, shunt, dead space, and oxygen carriage."],
      ["asthma-copd", "Asthma and COPD", "Contrast obstructive pathophysiology, spirometry patterns, and treatment logic."],
    ],
  },
  {
    key: "renal",
    name: "Renal & Acid–Base",
    topics: [
      ["gfr", "GFR and autoregulation", "Explain filtration forces, autoregulation, and common causes of altered GFR."],
      ["acid-base", "Acid–base interpretation", "Work through primary disorders, compensation, anion gap, and mixed pictures."],
      ["diuretics", "Diuretics", "Map diuretic sites of action to electrolyte changes and clinical uses."],
    ],
  },
];

const modules = {};
const topics = {};

for (const [moduleIndex, moduleSpec] of moduleSpecs.entries()) {
  const [module] = await insertRows("modules", [{
    workspace_id: workspaceId,
    course_id: course.id,
    name: moduleSpec.name,
    sort_order: moduleIndex,
  }]);
  modules[moduleSpec.key] = module;

  for (const [topicIndex, [key, name, objective]] of moduleSpec.topics.entries()) {
    const [topic] = await insertRows("topics", [{
      workspace_id: workspaceId,
      module_id: module.id,
      name,
      sort_order: topicIndex,
      description: objective,
      last_studied_at: topicIndex % 2 === 0 ? new Date().toISOString() : null,
    }]);
    topics[key] = topic;
    await insertRows("learning_objectives", [{ workspace_id: workspaceId, topic_id: topic.id, body: objective, sort_order: 0 }]);
  }
}

const documentSpecs = [
  {
    key: "cardio-pack",
    title: "Demo Cardiovascular Physiology Pack",
    filename: "demo-cardiovascular-physiology.pdf",
    kind: "lecture",
    pageCount: 42,
    topicKeys: ["cardiac-cycle", "ecg", "haemodynamics", "heart-failure"],
  },
  {
    key: "resp-pack",
    title: "Demo Respiratory Mechanics Notes",
    filename: "demo-respiratory-mechanics.pdf",
    kind: "lecture",
    pageCount: 36,
    topicKeys: ["ventilation", "gas-exchange", "asthma-copd"],
  },
  {
    key: "renal-primer",
    title: "Demo Renal and Acid–Base Primer",
    filename: "demo-renal-acid-base.pdf",
    kind: "textbook",
    pageCount: 58,
    topicKeys: ["gfr", "acid-base", "diuretics"],
  },
  {
    key: "integrated-cases",
    title: "Demo Integrated Cases: Breathlessness",
    filename: "demo-integrated-breathlessness.pdf",
    kind: "other",
    pageCount: 24,
    topicKeys: ["heart-failure", "gas-exchange", "asthma-copd", "acid-base"],
  },
];

const documents = {};

for (const documentSpec of documentSpecs) {
  const [document] = await insertRows("documents", [{
    workspace_id: workspaceId,
    uploaded_by: user.id,
    kind: documentSpec.kind,
    status: "ready",
    title: documentSpec.title,
    original_filename: documentSpec.filename,
    storage_path: `${user.id}/demo-atlas/${documentSpec.filename}`,
    page_count: documentSpec.pageCount,
    metadata: { demo_seed: true },
  }]);
  documents[documentSpec.key] = document;
  await insertRows("document_topics", documentSpec.topicKeys.map((topicKey) => ({ workspace_id: workspaceId, document_id: document.id, topic_id: topics[topicKey].id })));
  await insertRows("document_pages", Array.from({ length: 4 }, (_, index) => ({
    workspace_id: workspaceId,
    document_id: document.id,
    page_number: index + 1,
    extracted_text: `${documentSpec.title} demo page ${index + 1}. This invented educational extract is present so source-aware features and the atlas can show citation structure without committing real copyrighted material.`,
  })));
}

const noteSpecs = [
  ["cardiac-cycle", "Valve timing anchor", "A useful way to organise the cardiac cycle is to track pressure gradients first, then valves, then volume changes. S1 follows AV valve closure; S2 follows semilunar valve closure.", "cardio-pack", 8],
  ["cardiac-cycle", "PV loop checkpoints", "End-diastolic volume, isovolumetric contraction, ejection, end-systolic volume, and isovolumetric relaxation give a fast route through most cardiac-cycle questions.", "cardio-pack", 12],
  ["ecg", "Intervals worth memorising", "PR interval reflects atrial depolarisation plus AV nodal delay. QRS duration reflects ventricular depolarisation. QT changes with rate and repolarisation timing.", "cardio-pack", 17],
  ["haemodynamics", "Resistance versus flow", "Flow rises with pressure gradient and falls with resistance. Small radius changes dominate because resistance varies strongly with vessel radius.", "cardio-pack", 23],
  ["heart-failure", "Compensation map", "Sympathetic drive, RAAS activation, and fluid retention can temporarily preserve perfusion but increase cardiac workload and congestion over time.", "integrated-cases", 6],
  ["ventilation", "Compliance intuition", "Low compliance means more pressure is needed for a given volume change. High airway resistance increases work of breathing, especially during expiration.", "resp-pack", 9],
  ["gas-exchange", "V/Q mismatch labels", "Low V/Q behaves more like shunt; high V/Q behaves more like dead space. Oxygen response helps separate mechanisms in exam stems.", "resp-pack", 19],
  ["asthma-copd", "Obstructive pattern", "Obstruction lowers FEV1 more than FVC. Asthma is classically variable and reversible; COPD is usually persistent and progressive.", "integrated-cases", 11],
  ["gfr", "Filtration forces", "GFR depends on glomerular hydrostatic pressure, Bowman space pressure, plasma oncotic pressure, and filtration coefficient.", "renal-primer", 14],
  ["acid-base", "ABG sequence", "Start with pH, identify the primary process, check compensation, calculate anion gap when metabolic acidosis is present, then ask whether there is a mixed disorder.", "renal-primer", 31],
  ["diuretics", "Site of action map", "Loop diuretics act in the thick ascending limb; thiazides in the distal convoluted tubule; potassium-sparing agents act later in the collecting system.", "renal-primer", 44],
  ["acid-base", "Breathlessness acid-base link", "Respiratory failure can create respiratory acidosis, while shock or severe hypoxia can add lactic metabolic acidosis. Mixed pictures need deliberate checking.", "integrated-cases", 18],
];

const insertedNotes = {};
for (const [topicKey, title, body, documentKey, page] of noteSpecs) {
  const [note] = await insertRows("notes", [{ workspace_id: workspaceId, topic_id: topics[topicKey].id, author_id: user.id, title, body }]);
  insertedNotes[title] = note;
  await insertRows("note_citations", [{ workspace_id: workspaceId, note_id: note.id, document_id: documents[documentKey].id, page_start: page, page_end: page, excerpt: body.slice(0, 220) }]);
}

const flashcardSpecs = {
  "cardiac-cycle": [
    ["What closes at S1?", "The atrioventricular valves close at the start of ventricular systole."],
    ["What happens during isovolumetric contraction?", "Ventricular pressure rises while all valves are closed and volume stays constant."],
  ],
  ecg: [
    ["What does the PR interval represent?", "Atrial depolarisation plus AV nodal conduction delay."],
    ["What does a narrow QRS usually imply?", "Ventricular activation is occurring through the normal His-Purkinje system."],
  ],
  haemodynamics: [["How does vessel radius affect resistance?", "Small radius decreases greatly increase resistance and reduce flow."]],
  "heart-failure": [
    ["Name two compensatory systems in heart failure.", "Sympathetic nervous system activation and RAAS activation."],
    ["Why can fluid retention worsen symptoms?", "It increases preload and venous congestion, contributing to oedema and breathlessness."],
  ],
  ventilation: [["What does low lung compliance mean?", "More pressure is required to produce a given volume change."]],
  "gas-exchange": [["What does high V/Q resemble?", "Dead space ventilation: ventilation without matching perfusion."], ["What does low V/Q resemble?", "Shunt physiology: perfusion without adequate ventilation."]],
  "asthma-copd": [["What spirometry pattern suggests obstruction?", "Reduced FEV1/FVC ratio."]],
  gfr: [["What pressures oppose glomerular filtration?", "Bowman space hydrostatic pressure and plasma oncotic pressure."]],
  "acid-base": [["First step in ABG interpretation?", "Check the pH to determine acidaemia or alkalaemia."], ["When do you calculate anion gap?", "When metabolic acidosis is present."]],
  diuretics: [["Where do loop diuretics act?", "The thick ascending limb of the loop of Henle."]],
};

for (const [topicKey, cards] of Object.entries(flashcardSpecs)) {
  const [deck] = await insertRows("flashcard_decks", [{ workspace_id: workspaceId, topic_id: topics[topicKey].id, name: `${topics[topicKey].name} cards` }]);
  await insertRows("flashcards", cards.map(([front, back], index) => ({
    workspace_id: workspaceId,
    deck_id: deck.id,
    kind: "basic",
    front,
    back,
    is_kept: index % 3 !== 2,
    source_document_id: documentSpecs.find((documentSpec) => documentSpec.topicKeys.includes(topicKey)) ? documents[documentSpecs.find((documentSpec) => documentSpec.topicKeys.includes(topicKey)).key].id : null,
    source_page_start: index + 1,
    source_page_end: index + 1,
  })));
}

const examSpecs = [
  {
    title: "Cardiorespiratory Integration SBA",
    exam_date: addDays(24),
    target_minutes: 960,
    notes: "Demo exam focused on physiology links and applied interpretation.",
    topicKeys: ["cardiac-cycle", "ecg", "haemodynamics", "heart-failure", "ventilation", "gas-exchange", "asthma-copd"],
  },
  {
    title: "Renal and Acid–Base Short Answer",
    exam_date: addDays(38),
    target_minutes: 720,
    notes: "Demo exam for calculations and structured interpretation.",
    topicKeys: ["gfr", "acid-base", "diuretics", "gas-exchange"],
  },
];

const exams = {};
for (const examSpec of examSpecs) {
  const [exam] = await insertRows("study_exams", [{ workspace_id: workspaceId, course_id: course.id, title: examSpec.title, exam_date: examSpec.exam_date, target_minutes: examSpec.target_minutes, notes: examSpec.notes }]);
  exams[examSpec.title] = exam;
  await insertRows("study_exam_topics", examSpec.topicKeys.map((topicKey, index) => ({
    workspace_id: workspaceId,
    exam_id: exam.id,
    topic_id: topics[topicKey].id,
    weight: Math.min(5, 2 + (index % 4)),
    confidence: Math.max(1, 4 - (index % 4)),
  })));
}

await insertRows("study_availability_rules", [
  [0, 90],
  [1, 75],
  [2, 90],
  [3, 60],
  [4, 90],
  [5, 45],
  [6, 120],
].map(([day_of_week, minutes_available]) => ({ workspace_id: workspaceId, day_of_week, minutes_available })));

const planBlockSpecs = [
  ["Cardiorespiratory Integration SBA", "cardiac-cycle", 1, 90, "PV loops + valve timing"],
  ["Cardiorespiratory Integration SBA", "ecg", 2, 60, "ECG intervals drill"],
  ["Cardiorespiratory Integration SBA", "gas-exchange", 3, 90, "V/Q mismatch cases"],
  ["Cardiorespiratory Integration SBA", "heart-failure", 5, 75, "Heart failure compensation"],
  ["Cardiorespiratory Integration SBA", "asthma-copd", 7, 60, "Obstructive disease comparison"],
  ["Renal and Acid–Base Short Answer", "acid-base", 9, 90, "ABG interpretation ladder"],
  ["Renal and Acid–Base Short Answer", "gfr", 11, 60, "GFR forces recap"],
  ["Renal and Acid–Base Short Answer", "diuretics", 13, 60, "Diuretic site map"],
  ["Renal and Acid–Base Short Answer", "acid-base", 15, 75, "Mixed disorder practice"],
];

await insertRows("study_plan_blocks", planBlockSpecs.map(([examTitle, topicKey, daysFromNow, durationMinutes, title]) => ({
  workspace_id: workspaceId,
  exam_id: exams[examTitle].id,
  topic_id: topics[topicKey].id,
  starts_on: addDays(daysFromNow),
  duration_minutes: durationMinutes,
  title,
  status: "planned",
})));

console.log(`Seeded Study Atlas demo workspace for ${demoEmail}.`);
console.log("Created: 1 course, 3 modules, 10 topics, 4 demo sources, 12 notes, flashcards, 2 exams, and 9 planner blocks.");
