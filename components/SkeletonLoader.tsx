'use client';

interface SkeletonProps {
  className?: string;
}

function Sk({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <Sk className="w-14 h-14 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Sk className="h-4 w-3/4" />
        <Sk className="h-3 w-1/2" />
        <Sk className="h-3 w-1/3" />
      </div>
      <Sk className="w-16 h-8 rounded-lg flex-shrink-0" />
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3 mb-3">
        <Sk className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Sk className="h-4 w-2/3" />
          <Sk className="h-3 w-1/2" />
        </div>
        <Sk className="w-20 h-6 rounded-full" />
      </div>
      <div className="flex gap-2 mt-3">
        <Sk className="h-3 w-24" />
        <Sk className="h-3 w-20" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <Sk className="w-10 h-10 rounded-xl" />
        <Sk className="h-3 w-20" />
      </div>
      <Sk className="h-7 w-16 mb-1" />
      <Sk className="h-3 w-24" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Sk className="w-20 h-20 rounded-2xl" />
        <div className="space-y-2">
          <Sk className="h-5 w-40" />
          <Sk className="h-3 w-32" />
          <Sk className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <Sk className="h-3 w-16" />
            <Sk className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <AppointmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Sk className="h-7 w-48" />
        <Sk className="h-4 w-64" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* List */}
      <ListSkeleton count={3} />
    </div>
  );
}

export default Sk;