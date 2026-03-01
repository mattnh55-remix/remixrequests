import "./globals.css";

export const metadata = {
  title: "Remix Song Requests",
  description: "Request songs, vote, and Play Now"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
