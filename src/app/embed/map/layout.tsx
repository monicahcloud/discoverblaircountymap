// app/embed/map/layout.tsx
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <title>Explore Map Embed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="m-0 p-0 overflow-hidden bg-white">{children}</body>
    </html>
  );
}
