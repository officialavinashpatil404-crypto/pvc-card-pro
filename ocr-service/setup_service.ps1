# setup_service.ps1
# Automates the setup of the local Python OCR and Transliteration service virtualenv

Write-Host "=== Setting up local Python OCR Service ===" -ForegroundColor Cyan

# 1. Check if Python is installed
$pythonExists = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonExists) {
    Write-Host "Error: Python 3 is not installed or not added to your PATH environment variable." -ForegroundColor Red
    Write-Host "Please download and install Python 3.10+ from https://www.python.org/downloads/ before running this script." -ForegroundColor Yellow
    exit 1
}

$pythonVersion = python --version
Write-Host "Found Python: $pythonVersion" -ForegroundColor Green

# 2. Check if virtualenv is in root of ocr-service
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment (venv)..." -ForegroundColor Green
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create virtual environment. Attempting to install virtualenv globally..." -ForegroundColor Yellow
        python -m pip install --user virtualenv
        python -m virtualenv venv
    }
} else {
    Write-Host "Virtual environment (venv) already exists." -ForegroundColor Green
}

# 3. Activate venv and install requirements
Write-Host "Activating virtual environment and installing packages..." -ForegroundColor Green
& ".\venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== Installation Complete! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the local OCR microservice, run:" -ForegroundColor Cyan
    Write-Host "    uvicorn main:app --reload --port 8000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Keep this terminal running during card extractions." -ForegroundColor Yellow
} else {
    Write-Host "Error: Installation of requirements failed. Please inspect errors above." -ForegroundColor Red
}
