import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | My Health',
  description: 'My Health login page for existing users.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
