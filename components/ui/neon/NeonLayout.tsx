import React from "react";

export function NeonLayout(props: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, subtitle, rightSlot, children } = props;

  return (
    <div className="neonRoot">
      <div className="neonWrap">
        <div className="neonHeader">
          <div>
            <div className="neonTitle">{title}</div>
            {subtitle ? <div className="neonSub">{subtitle}</div> : null}
          </div>
          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>

        {children}
      </div>
    </div>
  );
}