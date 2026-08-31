import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";

import store from "./store/store";
import App from "./App.jsx";
import { creerTheme } from "./theme.js";
import { NotifierProvider } from "./components/common/Notifier";
import "./index.css";

// Applique le thème clair ou sombre selon le mode stocké dans le store.
// eslint-disable-next-line react/only-export-components -- composant racine local à main.jsx
function AppAvecTheme() {
  const mode = useSelector((state) => state.theme.mode);
  const theme = useMemo(() => creerTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <NotifierProvider>
          <App />
        </NotifierProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <AppAvecTheme />
    </Provider>
  </StrictMode>
);
