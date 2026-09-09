export const metadata = { title: "omega dashboard" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f0f10", color: "#e5e5e5", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
