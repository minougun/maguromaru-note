export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-title-wrap">
      <h2 className="section-title">{title}</h2>
      <p className="section-sub">{subtitle}</p>
    </div>
  );
}
