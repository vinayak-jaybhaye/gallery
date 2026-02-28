import { Outlet } from "react-router-dom";
import MediaGrid from "@/components/gallery/MediaGrid";

export default function Gallery() {
  return (
    <>
      <MediaGrid />
      <Outlet />
    </>
  );
}