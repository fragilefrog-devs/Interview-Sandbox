/** Standard page frame: title, optional description and actions, then content. */
export function Page({ title, description, actions, children, width = "max-w-5xl" }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; width?: string;
}) {
  return (
    <div className={`mx-auto ${width} px-4 py-8 sm:px-8`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
