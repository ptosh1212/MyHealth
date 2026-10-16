import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ai-receptionist | My Health',
  description: 'My Health ai-receptionist.',
};

export default function AiReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
