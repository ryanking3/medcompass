import type { AppView, Notify } from "./types";

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
  notify: Notify;
};

export function AppSidebar({ view, onNavigate, onCreateTopic, notify }: AppSidebarProps) {
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
        <button className="course-switcher" onClick={() => notify("Course switching is part of the upcoming workspace setup.")}><span className="course-dot" /><span>Graduate Entry Medicine</span><span className="chevron">⌄</span></button>
      </div>

      <div className="topic-list">
        <p className="eyebrow">Topics</p>
        <button className={view === "dashboard" ? "topic-item active" : "topic-item"} onClick={() => onNavigate("dashboard")}>Cardiac cycle</button>
        <button className="topic-item" onClick={() => notify("This is a static prototype; only Cardiac cycle is available.")}>Cardiac output</button>
        <button className="topic-item" onClick={() => notify("This is a static prototype; only Cardiac cycle is available.")}>ECG fundamentals</button>
        <button className="subtle-button add-topic" onClick={onCreateTopic}>+ New topic</button>
      </div>

      <div className="sidebar-footer">
        <button className="profile-button" onClick={() => notify("Account settings will be added with authentication.")}><span className="avatar">RK</span><span><strong>Ryan King</strong><small>Student workspace</small></span><span className="chevron">⋯</span></button>
      </div>
    </aside>
  );
}
