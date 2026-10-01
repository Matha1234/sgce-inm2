<#
  Sauvegarde quotidienne de SGCE-INM (exigence NF-01)
    1. Export Oracle Data Pump du schéma applicatif
    2. Archive du volume des médias (photos de profil)
    3. Suppression des sauvegardes plus anciennes que la durée de rétention

  Prérequis (voir chapitre 8, section 8.7) :
    - objet DIRECTORY Oracle « DP_SGCE » créé et pointant vers $Dossier
    - variable d'environnement SGCE_ORACLE_PASSWORD définie pour le compte qui exécute la tâche
#>
param(
    [string]$Utilisateur    = "<UTILISATEUR_ORACLE>",
    [string]$Service        = "localhost:1521/FREEPDB1",
    [string]$Repertoire     = "DP_SGCE",
    [string]$Dossier        = "D:\Sauvegardes\Oracle",
    [string]$Expdp          = "C:\Oracle\product\26ai\26ai\dbhomeFree\bin\expdp.exe",
    [string]$ImageBackend   = "sgce-inm/backend:1.0",
    [int]   $RetentionJours = 14
)

$ErrorActionPreference = "Stop"
$horodatage = Get-Date -Format "yyyyMMdd_HHmm"
$journal    = Join-Path $Dossier "sauvegarde_$horodatage.txt"

function Ecrire([string]$message) {
    $ligne = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
    Add-Content -Path $journal -Value $ligne
    Write-Host $ligne
}

if (-not (Test-Path $Dossier)) { New-Item -ItemType Directory -Path $Dossier | Out-Null }
$motDePasse = $env:SGCE_ORACLE_PASSWORD
if (-not $motDePasse) { Ecrire "ERREUR : variable SGCE_ORACLE_PASSWORD absente."; exit 1 }

# 1) Export Oracle
Ecrire "Export Data Pump en cours..."
& $Expdp "$Utilisateur/$motDePasse@$Service" schemas=$Utilisateur directory=$Repertoire `
    dumpfile="sgce_$horodatage.dmp" logfile="sgce_$horodatage.log"
if ($LASTEXITCODE -ne 0) { Ecrire "ERREUR : expdp a échoué (code $LASTEXITCODE)."; exit 1 }
Ecrire "Export Oracle terminé : sgce_$horodatage.dmp"

# 2) Médias : n'empêche pas la sauvegarde Oracle si Docker est indisponible
try {
    docker run --rm -v sgce_media_data:/data -v "${Dossier}:/backup" --entrypoint tar `
        $ImageBackend czf "/backup/media_$horodatage.tgz" -C /data .
    if ($LASTEXITCODE -ne 0) { throw "code $LASTEXITCODE" }
    Ecrire "Archive des médias créée : media_$horodatage.tgz"
} catch {
    Ecrire "AVERTISSEMENT : archive des médias non créée ($_)."
}

# 3) Rétention
Get-ChildItem -Path $Dossier -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionJours) } |
    Remove-Item -Force
Ecrire "Nettoyage des sauvegardes de plus de $RetentionJours jours effectué."
