import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | My Health',
  description: 'My Health admin dashboard for doctor verification and user management.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}