import { Toaster } from "react-hot-toast";
import { AppRouter } from "./router.jsx";
export function App() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </>
  );
}
