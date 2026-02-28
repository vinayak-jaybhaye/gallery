import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import {
  Login,
  Gallery,
  MediaViewer,
  Trash
} from "@/pages";
import Uploads from "@/pages/Uploads";
import AccountAndSettings from "@/pages/AccountAndSettings";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/gallery",
    element: (
      <ProtectedRoute>
        <Gallery />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ":mediaId",
        element: <MediaViewer />
      }
    ]
  },
  {
    path: "/uploads",
    element: (
      <ProtectedRoute>
        <Uploads />
      </ProtectedRoute>
    )
  },
  {
    path: "/accountandsettings",
    element: (
      <ProtectedRoute>
        <AccountAndSettings />
      </ProtectedRoute>
    )
  },
  {
    path: "/trash",
    element: (
      <ProtectedRoute>
        <Trash />
      </ProtectedRoute>
    )
  }
]);