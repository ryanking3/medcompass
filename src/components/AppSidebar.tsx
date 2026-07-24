import type { AppView, StudyCourse, StudyTopic } from "./types";

function Brand() {
  return <div className="brand" aria-label="MedCompass"><span className="brand-mark" aria-hidden="true">M</span><span>MedCompass</span></div>;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

type AppSidebarProps = {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onCreateTopic: () => void;
  email: string;
  onSignOut: () => void;
  courses: StudyCourse[];
  selectedCourseId: string | null;
  selectedTopicId: string | null;
  onSelectCourse: (courseId: string) => void;
  onSelectTopic: (topic: StudyTopic) => void;
};

export function AppSidebar({ view, onNavigate, onCreateTopic, email, onSignOut, courses, selectedCourseId, selectedTopicId, onSelectCourse, onSelectTopic }: AppSidebarProps) {
  const initials = email.slice(0, 2).toUpperCase();
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const topics = selectedCourse?.modules.flatMap((module) => module.topics) ?? [];

  return (
    <aside className="sidebar">
      <Brand />
      <nav className="primary-nav" aria-label="Primary navigation">
        <button className={view === "home" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("home")}><Icon>⌂</Icon> Home</button>
        <button className={view === "library" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("library")}><Icon>▤</Icon> Library</button>
        <button className={view === "notes" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("notes")}><Icon>↗</Icon> Notes</button>
        <button className={view === "cards" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("cards")}><Icon>◇</Icon> Cards</button>
      </nav>

      <div className="sidebar-section">
        <p className="eyebrow">Current course</p>
        {courses.length > 0 ? (
          <label className="course-switcher"><span className="course-dot" /><select value={selectedCourse?.id ?? ""} onChange={(event) => onSelectCourse(event.target.value)} aria-label="Current course">{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
        ) : <button className="course-switcher" onClick={onCreateTopic}><span className="course-dot" /><span>Create your first course</span><span className="chevron">+</span></button>}
      </div>

      <div className="topic-list">
        <p className="eyebrow">Topics</p>
        {topics.length > 0 ? topics.map((topic) => <button key={topic.id} className={view === "dashboard" && topic.id === selectedTopicId ? "topic-item active" : "topic-item"} onClick={() => onSelectTopic(topic)}>{topic.name}</button>) : <p className="empty-topics">Create a topic to organise your sources, notes, and cards.</p>}
        <button className="subtle-button add-topic" onClick={onCreateTopic}>+ New topic</button>
      </div>

      <div className="sidebar-footer">
        <div className="profile-button"><span className="avatar">{initials}</span><span><strong>{email}</strong><small>Student workspace</small></span></div>
        <button className="sign-out-button" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
