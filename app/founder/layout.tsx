import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founder | My Health',
  description: 'My Health About the founder.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
