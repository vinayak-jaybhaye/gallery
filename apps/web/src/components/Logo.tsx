export default function Logo({ className = "" }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src="/gallery.svg"
        alt="Gallery"
        className="w-auto h-full"
      />
    </div>
  );
}
