import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | My Health',
  description: 'My Health sign up page for new users.',
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
