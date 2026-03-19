import useBodyClass from "../lib/useBodyClass";

export default function AuthShell({
  eyebrow,
  title,
  lead,
  statusTitle,
  statusText,
  showStatusCard = true,
  brandClassName = "",
  children,
}) {
  useBodyClass("");

  const brandPanelClass = `panel panel-brand ${brandClassName}`.trim();

  return (
    <main className="page">
      <section className={brandPanelClass} aria-hidden="true">
        <p className="eyebrow">Quiz Platform</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {showStatusCard ? (
          <div className="status-card">
            <h2>{statusTitle}</h2>
            <p>{statusText}</p>
          </div>
        ) : (
          <p className="panel-brand-note">{statusText}</p>
        )}
      </section>

      <section className="panel panel-form">
        <div className="form-wrap">
          <p className="eyebrow">{eyebrow}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
