import type { AppView, StudyCourse, StudyTopic } from "./types";

function Brand() {
  return <div className="brand" aria-label="MedCompass"><span className="brand-mark" aria-hidden="true">M</span><span className="sidebar-label">MedCompass</span></div>;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
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
        <button className="sidebar-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? "›" : "‹"}</button>
      </div>
      <nav className="primary-nav" aria-label="Primary navigation">
        <button className={view === "home" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("home")} title="Home" aria-label="Home"><Icon>⌂</Icon><span className="sidebar-label">Home</span></button>
        <button className={view === "library" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("library")} title="Library" aria-label="Library"><Icon>▤</Icon><span className="sidebar-label">Library</span></button>
        <button className={view === "atlas" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("atlas")} title="Atlas" aria-label="Atlas"><Icon>✣</Icon><span className="sidebar-label">Atlas</span></button>
        <button className={view === "planner" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("planner")} title="Planner" aria-label="Planner"><Icon>◷</Icon><span className="sidebar-label">Planner</span></button>
        <button className={view === "notes" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("notes")} title="Notes" aria-label="Notes"><Icon>↗</Icon><span className="sidebar-label">Notes</span></button>
        <button className={view === "cards" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("cards")} title="Cards" aria-label="Cards"><Icon>◇</Icon><span className="sidebar-label">Cards</span></button>
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
