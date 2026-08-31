import { createTheme } from "@mui/material/styles";

/**
 * Design system centralisé du SGCFC-INM.
 *
 * `creerTheme(mode)` fabrique le thème clair ou sombre : toutes les pages
 * partagent les mêmes tailles, densités et traitements visuels grâce aux
 * surcharges de composants ci-dessous (boutons, champs, modales, tableaux,
 * chips et cartes) sans avoir à répéter de style dans chaque page.
 */
const PALETTE_BASE = {
  primary: { main: "#1565c0", dark: "#0d3c73", light: "#5e92f3", contrastText: "#ffffff" },
  secondary: { main: "#f9a825", dark: "#c77800", light: "#ffd95a", contrastText: "#1a1a1a" },
};

export function creerTheme(mode = "clair") {
  const sombre = mode === "sombre";

  return createTheme({
    palette: {
      mode: sombre ? "dark" : "light",
      ...PALETTE_BASE,
      background: sombre
        ? { default: "#0f1728", paper: "#182338" }
        : { default: "#f4f6fa", paper: "#ffffff" },
      divider: sombre ? "rgba(255, 255, 255, 0.12)" : "rgba(13, 60, 115, 0.12)",
      success: { main: sombre ? "#66bb6a" : "#2e7d32" },
      warning: { main: sombre ? "#ffa726" : "#ed6c02" },
      error: { main: sombre ? "#ef5350" : "#d32f2f" },
      info: { main: sombre ? "#29b6f6" : "#0288d1" },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: "-0.01em" },
      h5: { fontWeight: 700, letterSpacing: "-0.01em" },
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
      overline: { fontWeight: 700, letterSpacing: "0.09em" },
    },
    components: {
      // --- Boutons : taille et densité homogènes partout ---
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, textTransform: "none", fontWeight: 600 },
          containedPrimary: { boxShadow: "0 1px 2px rgba(13, 60, 115, 0.25)" },
          sizeLarge: { py: 1.1, px: 2.75, fontSize: "0.9375rem" },
          sizeSmall: { fontSize: "0.8125rem" },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiButtonGroup: {
        styleOverrides: { root: { boxShadow: "none" } },
      },

      // --- Champs : densité compacte (ERP) et coins adoucis ---
      MuiTextField: { defaultProps: { size: "small" } },
      MuiAutocomplete: { defaultProps: { size: "small" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: { root: { borderRadius: 8 } },
      },

      // --- Surfaces ---
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 1px 3px rgba(0, 0, 0, 0.45)"
                : "0 1px 3px rgba(13, 60, 115, 0.08)",
          }),
        },
      },

      // --- Modales : titres, contenus et actions standardisés ---
      MuiDialog: {
        defaultProps: { fullWidth: true },
        styleOverrides: { paper: { borderRadius: 14 } },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: ({ theme }) => ({
            px: 3,
            py: 2,
            fontWeight: 700,
            fontSize: "1.0625rem",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { px: 3, pt: 2.5, pb: 2 } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { px: 3, pb: 2.5, pt: 1, gap: 1 } },
      },

      // --- Tableaux : en-têtes identiques et densité maîtrisée ---
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.palette.divider, py: 1.1 }),
          head: ({ theme }) => ({
            bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#f6f8fb",
            fontWeight: 700,
            color: "text.secondary",
            fontSize: "0.8rem",
            whiteSpace: "nowrap",
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.12s",
            "&:last-of-type .MuiTableCell-root": { borderBottom: "none" },
          },
        },
      },

      // --- Divers ---
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 10 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiTabs: {
        styleOverrides: { indicator: { borderRadius: 2, height: 3 } },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
    },
  });
}

export default creerTheme("clair");
