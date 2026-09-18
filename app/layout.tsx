export const metadata = {
  title: "IT Intake & Resolution",
  description: "Ticket triage system — FDE portfolio build",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
