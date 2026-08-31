import { createSlice } from "@reduxjs/toolkit";

const CLE_STOCKAGE = "sgcfc_theme_mode";

function modeInitial() {
  try {
    return localStorage.getItem(CLE_STOCKAGE) === "sombre" ? "sombre" : "clair";
  } catch {
    return "clair";
  }
}

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: modeInitial() },
  reducers: {
    basculerMode: (state) => {
      state.mode = state.mode === "clair" ? "sombre" : "clair";
      try {
        localStorage.setItem(CLE_STOCKAGE, state.mode);
      } catch {
        // stockage indisponible : le mode reste actif pour la session
      }
    },
  },
});

export const { basculerMode } = themeSlice.actions;
export default themeSlice.reducer;
