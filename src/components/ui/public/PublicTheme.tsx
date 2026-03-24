"use client";

import { ReactNode, useEffect } from "react";
import PublicGunmetalTheme from "./PublicGunmetalTheme";

type PublicThemeProps = {
  children: ReactNode;
  shellClassName?: string;
  pageClassName?: string;
};

export default function PublicTheme({
  children,
  shellClassName = "",
  pageClassName = "",
}: PublicThemeProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevBodyColor = body.style.color;
    const prevBodyMargin = body.style.margin;

    html.style.background = "#04070d";
    body.style.background = "#04070d";
    body.style.color = "var(--rr-text, #f3f6fb)";
    body.style.margin = "0";

    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.color = prevBodyColor;
      body.style.margin = prevBodyMargin;
    };
  }, []);

  return (
    <>
      <PublicGunmetalTheme />
      <div className={["rrPublicPage", pageClassName].filter(Boolean).join(" ")}>
        <div className={["rrPublicShell", shellClassName].filter(Boolean).join(" ")}>
          {children}
        </div>
      </div>
    </>
  );
}