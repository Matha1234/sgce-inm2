import {
  Box, Card, CardContent, Chip, LinearProgress, Stack, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/**
 * Bibliothèque de cartes graphiques compactes (anneaux, donuts, barres
 * comparées, tendances, escaliers) — identité visuelle commune à toutes
 * les pages qui affichent des indicateurs chiffrés (tableau de bord,
 * rentabilité, etc.), pour que le même type de donnée se présente de la
 * même façon partout dans l'application.
 */

// Anneau/jauge compact : une valeur exprimée en pourcentage d'un total,
// avec le libellé et la valeur brute à côté.
export function CarteAnneau({ titre, pourcentage, libelleValeur, couleur = "#1565c0", sousTitre }) {
  const p = Math.max(0, Math.min(100, Math.round(pourcentage) || 0));
  const data = [{ v: p }, { v: 100 - p }];
  return (
    <Card sx={{ height: "100%", boxShadow: 1, transition: "box-shadow 0.15s, transform 0.15s", "&:hover": { boxShadow: 3, transform: "translateY(-1px)" } }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ width: 68, height: 68, position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="v" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                <Cell fill={couleur} />
                <Cell fill={alpha(couleur, 0.14)} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: couleur }}>{p}%</Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 12.5 }}>{titre}</Typography>
          <Typography variant="h6" sx={{ color: couleur, fontWeight: 700, lineHeight: 1.25 }}>{libelleValeur}</Typography>
          {sousTitre && <Typography variant="caption" color="text.disabled">{sousTitre}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

// Anneau multi-segments avec légende (répartition) — pour un statut avec
// plusieurs catégories.
export function CarteDonutLegende({ titre, segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const donnees = total > 0 ? segments : [{ label: "Aucune donnée", value: 1, couleur: "#e0e0e0" }];
  return (
    <Card sx={{ height: "100%", boxShadow: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{titre}</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 104, height: 104, position: "relative", flexShrink: 0 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donnees} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="100%"
                  stroke="none" paddingAngle={donnees.length > 1 ? 2 : 0} isAnimationActive={false}
                >
                  {donnees.map((s, i) => <Cell key={i} fill={s.couleur} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1 }}>{total}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>total</Typography>
            </Box>
          </Box>
          <Stack spacing={0.85} sx={{ minWidth: 0, flex: 1 }}>
            {segments.map((s) => (
              <Stack direction="row" key={s.label} alignItems="center" spacing={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.couleur, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1 }} noWrap>{s.label}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {s.value} · {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Paires de petites barres verticales comparant plusieurs groupes (ex.
// charge par atelier).
export function CarteComparaisonBarres({ titre, groupes }) {
  const HAUTEUR = 84;
  return (
    <Card sx={{ height: "100%", boxShadow: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}>{titre}</Typography>
        <Stack direction="row" spacing={3} justifyContent="center" alignItems="flex-end">
          {groupes.map((g) => (
            <Stack key={g.label} spacing={1} alignItems="center">
              <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ height: HAUTEUR }}>
                {g.valeurs.map((v) => (
                  <Stack key={v.label} alignItems="center" spacing={0.5} sx={{ height: "100%", justifyContent: "flex-end" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: v.couleur, fontSize: 10.5 }}>{v.pourcentage}%</Typography>
                    <Box sx={{ width: 14, borderRadius: 1, height: `${Math.max(4, v.pourcentage)}%`, bgcolor: v.couleur }} />
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{g.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

// Liste de barres de progression horizontales (ex. niveaux de stock).
export function CarteProgressionListe({ titre, lignes, texteVide = "Aucune donnée." }) {
  return (
    <Card sx={{ height: "100%", boxShadow: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{titre}</Typography>
        {lignes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{texteVide}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {lignes.map((l) => (
              <Box key={l.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" noWrap sx={{ maxWidth: "70%" }}>{l.label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: l.couleur }}>{l.pourcentage}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={Math.min(100, l.pourcentage)}
                  sx={{
                    height: 6, borderRadius: 3, bgcolor: alpha(l.couleur, 0.14),
                    "& .MuiLinearProgress-bar": { bgcolor: l.couleur, borderRadius: 3 },
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// Tendance (aire dégradée) — évolution d'une valeur dans le temps.
export function CarteTendance({ titre, data, mode, cleValeur = "nombre", nomSerie = "Valeur", idDegrade = "degradeTendance" }) {
  return (
    <Card sx={{ boxShadow: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{titre}</Typography>
        <Box sx={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1565c0" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={mode === "sombre" ? alpha("#fff", 0.12) : alpha("#000", 0.06)} />
              <XAxis dataKey="periode" tick={{ fontSize: 11, fill: mode === "sombre" ? "#bdbdbd" : "#616161" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: mode === "sombre" ? "#bdbdbd" : "#616161" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${mode === "sombre" ? "rgba(255,255,255,0.2)" : "#e0e0e0"}`, fontSize: 12 }} />
              <Area type="monotone" dataKey={cleValeur} name={nomSerie} stroke="#1565c0" strokeWidth={2} fill={`url(#${idDegrade})`} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

// Barres ascendantes avec badge de valeur — pour un classement compact.
export function CarteEscalier({ titre, data, sousTitre }) {
  const max = Math.max(1, ...data.map((d) => d.valeur));
  return (
    <Card sx={{ boxShadow: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{titre}</Typography>
        {sousTitre && <Typography variant="caption" color="text.secondary">{sousTitre}</Typography>}
        <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ height: 130, mt: 2, overflowX: "auto", pb: 0.5 }}>
          {data.map((d) => (
            <Stack key={d.label} alignItems="center" spacing={0.75} sx={{ height: "100%", justifyContent: "flex-end", minWidth: 56 }}>
              <Chip
                label={d.valeur} size="small"
                sx={{ height: 18, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(d.couleur, 0.15), color: d.couleur }}
              />
              <Box sx={{ width: 24, borderRadius: 1, bgcolor: d.couleur, height: `${Math.max(10, (d.valeur / max) * 78)}px` }} />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 64, fontSize: 10 }} title={d.label}>
                {d.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}