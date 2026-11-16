export default function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse bg-[#e3ece8] ${className}`} />;
}
