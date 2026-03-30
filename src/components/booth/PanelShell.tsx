"use client";

export default function PanelShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="boothPanel">
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">{title}</div>
          {subtitle ? <div className="boothPanelSub">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="boothPanelBody">{children}</div>
    </section>
  );
}
