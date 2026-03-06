import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  Login,
  Gallery,
  MediaViewer,
  Trash,
  Albums,
  AlbumDetails,
  Uploads,
  AccountAndSettings,
  SharedWithMe,
  MyShares,
  NotFound,
} from "@/pages";
import { AppLayout } from "@/components/layout";

// Reusable route config for media pages
const mediaRouteChildren = [
  {
    path: ":mediaId",
    element: <MediaViewer />
  }
];

// Media routes that share the same Gallery component
const mediaRoutes = ["/gallery", "/images", "/videos", "/favorites"].map((path) => ({
  path,
  element: <Gallery />,
  children: mediaRouteChildren
}));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/gallery" replace />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      ...mediaRoutes,
      {
        path: "/uploads",
        element: <Uploads />
      },
      {
        path: "/accountandsettings",
        element: <AccountAndSettings />
      },
      {
        path: "/trash",
        element: <Trash />
      },
      {
        path: "/albums",
        element: <Albums />
      },
      {
        path: "/albums/:albumId",
        element: <AlbumDetails />,
        children: mediaRouteChildren
      },
      {
        path: "/shared",
        element: <SharedWithMe />
      },
      {
        path: "/my-shares",
        element: <MyShares />
      }
    ]
  },
  {
    path: "/public/:token",
    element: <MediaViewer />
  },
  {
    path: "*",
    element: <ProtectedRoute><NotFound /></ProtectedRoute>
  }
]);