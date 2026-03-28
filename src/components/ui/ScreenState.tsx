export function ScreenState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="screen-state">
      <strong>{title}</strong>
      <div>{description}</div>
      {action}
    </div>
  );
}
