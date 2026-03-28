import '../styles/tailwind.css';

export const metadata = {
  title: 'P2P Insight',
  description: 'Object-Centric Process Mining & Anomaly Detection Platform',
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
