export default function Logo({ className = "" }) {
  return (
    <div className={`overflow-hidden select-none ${className}`}>
      <img
        src="/gallery.svg"
        alt="Gallery"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className="w-auto h-full select-none"
      />
    </div>
  );
}