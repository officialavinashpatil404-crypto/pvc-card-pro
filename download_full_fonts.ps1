$fonts = @(
    "Noto Sans Bengali",
    "Noto Sans Devanagari",
    "Noto Sans Kannada",
    "Noto Sans Malayalam",
    "Noto Sans Oriya",
    "Noto Sans Gurmukhi",
    "Noto Sans Tamil",
    "Noto Sans Telugu",
    "Noto Nastaliq Urdu",
    "Noto Sans Meetei Mayek"
)

$destDir = "public\fonts"
if (!(Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

foreach ($font in $fonts) {
    $fontNameNoSpace = $font -replace ' ', ''
    $urlEncodedFont = $font -replace ' ', '%20'
    $url = "https://fonts.google.com/download?family=$urlEncodedFont"
    $zipPath = "$destDir\$fontNameNoSpace.zip"
    $extractPath = "$destDir\$fontNameNoSpace"

    Write-Host "Downloading $font..."
    Invoke-WebRequest -Uri $url -OutFile $zipPath

    Write-Host "Extracting $font..."
    if (Test-Path -Path $extractPath) {
        Remove-Item -Path $extractPath -Recurse -Force
    }
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    
    # Move TTF files to the main fonts directory
    Get-ChildItem -Path $extractPath -Filter "*.ttf" -Recurse | ForEach-Object {
        $destFile = Join-Path -Path $destDir -ChildPath $_.Name
        if (Test-Path -Path $destFile) {
            Remove-Item -Path $destFile -Force
        }
        Move-Item -Path $_.FullName -Destination $destDir
    }

    # Cleanup
    Remove-Item -Path $zipPath -Force
    Remove-Item -Path $extractPath -Recurse -Force
}

Write-Host "All full TTF fonts downloaded and extracted successfully!"
