import type { AppView, StudyCourse, StudyTopic } from "./types";

function Brand() {
  return <div className="brand" aria-label="MedCompass"><span className="brand-mark" aria-hidden="true">M</span><span className="sidebar-label">MedCompass</span></div>;
}

const primaryNav: Array<{ view: AppView; label: string; mark: string }> = [
  { view: "home", label: "Home", mark: "H" },
  { view: "library", label: "Library", mark: "L" },
  { view: "notes", label: "Notes", mark: "N" },
  { view: "cards", label: "Cards", mark: "C" },
];

function NavMark({ children }: { children: React.ReactNode }) {
  return <span className="nav-mark" aria-hidden="true">{children}</span>;
}

type AppSidebarProps = {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onCreateTopic: () => void;
  email: string;
  fullName: string | null;
  onSignOut: () => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  courses: StudyCourse[];
  selectedCourseId: string | null;
  selectedTopicId: string | null;
  onSelectCourse: (courseId: string) => void;
  onSelectTopic: (topic: StudyTopic) => void;
};

export function AppSidebar({ view, onNavigate, onCreateTopic, email, fullName, onSignOut, onOpenSettings, collapsed, onToggleCollapsed, courses, selectedCourseId, selectedTopicId, onSelectCourse, onSelectTopic }: AppSidebarProps) {
  const initials = (fullName || email).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const topics = selectedCourse?.modules.flatMap((module) => module.topics) ?? [];
  const profileLabel = fullName || email;

  return (
    <aside className={collapsed ? "sidebar sidebar-collapsed" : "sidebar"}>
      <div className="sidebar-top">
        <Brand />
        <button className="sidebar-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}><span className="sidebar-toggle-icon" aria-hidden="true" /></button>
      </div>
      <nav className="primary-nav" aria-label="Primary navigation">
        {primaryNav.map((item) => <button key={item.view} className={view === item.view ? "nav-item active" : "nav-item"} onClick={() => onNavigate(item.view)} title={item.label} aria-label={item.label}><NavMark>{item.mark}</NavMark><span className="sidebar-label">{item.label}</span></button>)}
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
        <button className={view === "settings" ? "profile-button active" : "profile-button"} onClick={onOpenSettings} title="Account settings" aria-label="Account settings"><span className="avatar">{initials}</span><span className="sidebar-label"><strong>{profileLabel}</strong><small>{fullName ? email : "Account settings"}</small></span></button>
        <button className="sign-out-button" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
