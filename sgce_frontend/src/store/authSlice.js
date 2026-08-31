import { createSlice } from "@reduxjs/toolkit";

const accessInitial = localStorage.getItem("sgcfc_access") || null;
const refreshInitial = localStorage.getItem("sgcfc_refresh") || null;
let utilisateurInitial = null;
try {
  utilisateurInitial = JSON.parse(localStorage.getItem("sgcfc_utilisateur") || "null");
} catch {
  utilisateurInitial = null;
}

const authSlice = createSlice({
  name: "auth",
  initialState: {
    access: accessInitial,
    refresh: refreshInitial,
    utilisateur: utilisateurInitial,
    estAuthentifie: Boolean(accessInitial),
  },
  reducers: {
    setTokens: (state, action) => {
      state.access = action.payload.access;
      if (action.payload.refresh) {
        state.refresh = action.payload.refresh;
        localStorage.setItem("sgcfc_refresh", action.payload.refresh);
      }
      state.estAuthentifie = true;
      localStorage.setItem("sgcfc_access", state.access);
    },
    setUtilisateur: (state, action) => {
      state.utilisateur = action.payload;
      localStorage.setItem("sgcfc_utilisateur", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.access = null;
      state.refresh = null;
      state.utilisateur = null;
      state.estAuthentifie = false;
      localStorage.removeItem("sgcfc_access");
      localStorage.removeItem("sgcfc_refresh");
      localStorage.removeItem("sgcfc_utilisateur");
    },
  },
});

export const { setTokens, setUtilisateur, logout } = authSlice.actions;
export default authSlice.reducer;
