import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

import LoginPage from "./pages/LoginPage";
import ReinitialiserMotDePassePage from "./pages/ReinitialiserMotDePassePage";
import AccesRefusePage from "./pages/AccesRefusePage";
import DashboardHomePage from "./pages/DashboardHomePage";
import CommandesListPage from "./pages/CommandesListPage";
import CommandeCreatePage from "./pages/CommandeCreatePage";
import CommandeDetailPage from "./pages/CommandeDetailPage";
import DevisListPage from "./pages/DevisListPage";
import DevisDetailPage from "./pages/DevisDetailPage";
import EstimationsListPage from "./pages/EstimationsListPage";
import EstimationDetailPage from "./pages/EstimationDetailPage";
import DossiersListPage from "./pages/DossiersListPage";
import DossierDetailPage from "./pages/DossierDetailPage";
import StockPage from "./pages/StockPage";
import UtilisateursPage from "./pages/UtilisateursPage";
import FacturesListPage from "./pages/FacturesListPage";
import ControlesListPage from "./pages/ControlesListPage";
import MessageriePage from "./pages/MessageriePage";
import ParametresPage from "./pages/ParametresPage";
import CataloguePage from "./pages/CataloguePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePassePage />} />
      <Route path="/acces-refuse" element={<AccesRefusePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardHomePage />} />
          <Route path="/messagerie" element={<MessageriePage />} />
          <Route path="/parametres" element={<ParametresPage />} />

          {/* Agent SDO (+ Admin) : commandes, devis, estimations, factures */}
          <Route element={<ProtectedRoute rolesAutorises={["AGENT_SDO"]} />}>
            <Route path="/commandes" element={<CommandesListPage />} />
            <Route path="/commandes/nouvelle" element={<CommandeCreatePage />} />
            <Route path="/commandes/:id" element={<CommandeDetailPage />} />

            <Route path="/devis" element={<DevisListPage />} />
            <Route path="/devis/:id" element={<DevisDetailPage />} />

            <Route path="/estimations" element={<EstimationsListPage />} />
            <Route path="/estimations/:id" element={<EstimationDetailPage />} />

            <Route path="/factures" element={<FacturesListPage />} />
          </Route>

          <Route element={<ProtectedRoute rolesAutorises={["CHEF_ATELIER", "AGENT_SDO"]} />}>
            <Route path="/dossiers" element={<DossiersListPage />} />
            <Route path="/dossiers/:id" element={<DossierDetailPage />} />
          </Route>

          <Route element={<ProtectedRoute rolesAutorises={["MAGASINIER"]} />}>
            <Route path="/stock" element={<StockPage />} />
          </Route>

          {/* Agent SDO : contrôle du prix de revient (UC-06). Admin : accès via ProtectedRoute. */}
          <Route element={<ProtectedRoute rolesAutorises={["AGENT_SDO"]} />}>
            <Route path="/rentabilite" element={<ControlesListPage />} />
          </Route>

          {/* Admin uniquement : comptes utilisateurs et catalogue (référentiel). */}
          <Route element={<ProtectedRoute rolesAutorises={[]} />}>
            <Route path="/utilisateurs" element={<UtilisateursPage />} />
            <Route path="/catalogue" element={<CataloguePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}