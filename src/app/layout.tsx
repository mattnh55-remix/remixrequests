import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Remix Song Requests",
  description: "Request songs, vote, and Play Now"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
<Script
  id="mcjs"
  strategy="afterInteractive"
  src="https://chimpstatic.com/mcjs-connected/js/users/3e95a9a3301c9535cb83b0e42/d33d266fe044617208b86b857.js"
/>
{children}</body>
    </html>
  );
}
