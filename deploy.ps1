# ════════════════════════════════════════════════════════════════
# SCRIPT DE DÉPLOIEMENT DOCKER - SGCE-INM
# À placer dans: K:\STAGE M2 IMPRIMERIE NATIONNALE\ProjetINM\sgce-inm\deploy.ps1
# 
# Utilisation:
#   .\deploy.ps1 -action start    # Démarrer le projet
#   .\deploy.ps1 -action stop     # Arrêter le projet
#   .\deploy.ps1 -action restart  # Redémarrer
#   .\deploy.ps1 -action logs     # Voir les logs
#   .\deploy.ps1 -action status   # État des conteneurs
# ════════════════════════════════════════════════════════════════

param(
    [string]$action = "start",
    [string]$service = "all"  # all, backend, frontend
)

# Couleurs pour l'affichage
$green = [System.ConsoleColor]::Green
$red = [System.ConsoleColor]::Red
$yellow = [System.ConsoleColor]::Yellow
$cyan = [System.ConsoleColor]::Cyan

function Write-Info {
    Write-Host $args -ForegroundColor $cyan
}

function Write-Success {
    Write-Host $args -ForegroundColor $green
}

function Write-Error {
    Write-Host "❌ ERREUR: $args" -ForegroundColor $red
}

function Write-Warning {
    Write-Host "⚠️  ATTENTION: $args" -ForegroundColor $yellow
}

# Vérifier que Docker est installé
function Check-Docker {
    Write-Info "🐳 Vérification de Docker..."
    
    try {
        $version = docker --version
        Write-Success "✅ Docker trouvé: $version"
        return $true
    }
    catch {
        Write-Error "Docker n'est pas installé ou non accessible"
        Write-Warning "Télécharge Docker Desktop depuis: https://www.docker.com/products/docker-desktop"
        return $false
    }
}

# Vérifier que docker-compose.yml existe
function Check-Files {
    Write-Info "📁 Vérification des fichiers..."
    
    if (!(Test-Path "docker-compose.yml")) {
        Write-Error "Le fichier docker-compose.yml n'existe pas"
        Write-Info "Place docker-compose.yml dans le répertoire courant"
        return $false
    }
    
    if (!(Test-Path "sgce_backend/Dockerfile")) {
        Write-Error "Le fichier sgce_backend/Dockerfile n'existe pas"
        return $false
    }
    
    if (!(Test-Path "sgce_frontend/Dockerfile")) {
        Write-Error "Le fichier sgce_frontend/Dockerfile n'existe pas"
        return $false
    }
    
    Write-Success "✅ Tous les fichiers nécessaires sont présents"
    return $true
}

# Vérifier Oracle
function Check-Oracle {
    Write-Info "🗄️  Vérification de la connexion à Oracle..."
    
    try {
        $connected = sqlplus -v
        Write-Success "✅ Oracle client trouvé"
        return $true
    }
    catch {
        Write-Warning "Oracle client n'est pas accessible via sqlplus"
        Write-Info "Mais Docker peut quand même accéder à Oracle sur host.docker.internal"
        return $true
    }
}

# Démarrer les conteneurs
function Start-Containers {
    Write-Info "🚀 Démarrage des conteneurs..."
    Write-Info ""
    
    docker-compose up
}

# Démarrer en arrière-plan
function Start-Containers-Background {
    Write-Info "🚀 Démarrage des conteneurs (arrière-plan)..."
    
    docker-compose up -d
    
    Write-Success "✅ Conteneurs démarrés"
    Write-Info ""
    Write-Info "Accès à l'application:"
    Write-Info "  Frontend: http://localhost:5173"
    Write-Info "  Backend:  http://localhost:8000/api"
    Write-Info "  Admin:    http://localhost:8000/admin"
    Write-Info ""
    Write-Info "Pour voir les logs: docker-compose logs -f"
}

# Arrêter les conteneurs
function Stop-Containers {
    Write-Info "⏹️  Arrêt des conteneurs..."
    
    docker-compose down
    
    Write-Success "✅ Conteneurs arrêtés"
}

# Redémarrer les conteneurs
function Restart-Containers {
    Write-Info "🔄 Redémarrage des conteneurs..."
    
    docker-compose restart
    
    Write-Success "✅ Conteneurs redémarrés"
}

# Voir l'état des conteneurs
function Show-Status {
    Write-Info "📊 État des conteneurs:"
    Write-Info ""
    
    docker-compose ps
}

# Voir les logs
function Show-Logs {
    Write-Info "📋 Affichage des logs (Ctrl+C pour arrêter)..."
    Write-Info ""
    
    docker-compose logs -f
}

# Voir les logs d'un service spécifique
function Show-Logs-Service {
    param([string]$ServiceName)
    
    Write-Info "📋 Logs du service '$ServiceName':"
    Write-Info ""
    
    docker-compose logs -f $ServiceName
}

# Reconstruire les images
function Rebuild-Images {
    Write-Info "🔨 Reconstruction des images..."
    Write-Warning "Cela peut prendre plusieurs minutes"
    Write-Info ""
    
    docker-compose build
    
    Write-Success "✅ Images reconstruites"
}

# Afficher le menu d'aide
function Show-Help {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║       SCRIPT DE DÉPLOIEMENT DOCKER - SGCE-INM                 ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "UTILISATION:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -action <commande>" -ForegroundColor Green
    Write-Host ""
    Write-Host "COMMANDES DISPONIBLES:" -ForegroundColor Yellow
    Write-Host "  start           Démarrer les conteneurs (logs visibles)"
    Write-Host "  start-bg        Démarrer en arrière-plan"
    Write-Host "  stop            Arrêter les conteneurs"
    Write-Host "  restart         Redémarrer les conteneurs"
    Write-Host "  status          Afficher l'état des conteneurs"
    Write-Host "  logs            Afficher les logs (temps réel)"
    Write-Host "  logs-backend    Afficher les logs du backend"
    Write-Host "  logs-frontend   Afficher les logs du frontend"
    Write-Host "  build           Reconstruire les images"
    Write-Host "  check           Vérifier la configuration"
    Write-Host "  help            Afficher cette aide"
    Write-Host ""
    Write-Host "EXEMPLES:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -action start"
    Write-Host "  .\deploy.ps1 -action logs"
    Write-Host "  .\deploy.ps1 -action rebuild"
    Write-Host ""
}

# Main
Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SGCE-INM Docker Deployment Manager v1.0                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifications préalables
if (!(Check-Docker)) {
    exit 1
}

if (!(Check-Files)) {
    exit 1
}

Check-Oracle | Out-Null

Write-Host ""

# Exécuter l'action demandée
switch ($action.ToLower()) {
    "start" {
        Start-Containers
    }
    "start-bg" {
        Start-Containers-Background
    }
    "stop" {
        Stop-Containers
    }
    "restart" {
        Restart-Containers
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    "logs-backend" {
        Show-Logs-Service "backend"
    }
    "logs-frontend" {
        Show-Logs-Service "frontend"
    }
    "build" {
        Rebuild-Images
    }
    "rebuild" {
        Rebuild-Images
    }
    "check" {
        Write-Info "✅ Toutes les vérifications passées"
    }
    "help" {
        Show-Help
    }
    default {
        Write-Warning "Action inconnue: $action"
        Show-Help
    }
}

Write-Host ""
