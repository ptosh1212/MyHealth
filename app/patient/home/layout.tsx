import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patient Home | My Health',
  description: 'My Health patient home page.',
};

export default function PatientHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
