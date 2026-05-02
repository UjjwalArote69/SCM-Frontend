import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../hooks/useTheme.jsx";
import { ToastProvider } from "../hooks/useToast.jsx";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
