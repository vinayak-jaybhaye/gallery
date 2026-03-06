import MediaGrid from "@/components/gallery/MediaGrid";

export default function SharedWithMe() {
  return (
    <div className="w-full p-4 sm:p-6 bg-bg-app">
      <div className="sticky top-16 z-20 mb-6 bg-bg-app pb-4 pt-2 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">Shared with me</h1>
        <p className="text-text-secondary text-sm mt-1">
          Media others have shared with you.
        </p>
      </div>

      <MediaGrid scope={{ type: "sharedWithMe" }} viewerBasePath="/gallery" />
    </div>
  );
}