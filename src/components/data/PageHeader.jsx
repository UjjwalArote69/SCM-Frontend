export default function PageHeader({ title, subtitle, actions, crumbs }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        {crumbs}
        <h1 className="text-3xl font-bold text-text tracking-tight">{title}</h1>
        {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
