import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Doctor Dashboard | My Health',
  description: 'My Health doctor dashboard for managing patient records and appointments.',
};

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
