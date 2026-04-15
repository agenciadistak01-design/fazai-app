import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FAZAÍ — Seu site profissional em 15 minutos',
  description:
    'Converse com a IA, ela cria seu site. Sem editor, sem template, sem complicação.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
