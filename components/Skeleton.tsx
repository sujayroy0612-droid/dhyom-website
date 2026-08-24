interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export default function Skeleton({ className = "", rounded = "rounded-none" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}
