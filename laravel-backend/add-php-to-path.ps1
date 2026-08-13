# PowerShell script to add PHP to PATH
# Run this as Administrator

$phpPaths = @(
    "C:\Program Files\PHP\v8.2\",
    "C:\Program Files\PHP\v8.3\",
    "C:\xampp\php\",
    "$env:LOCALAPPDATA\Programs\Composer\vendor\bin"
)

$found = $false
foreach ($path in $phpPaths) {
    if (Test-Path "$path\php.exe") {
        Write-Host "Found PHP at: $path" -ForegroundColor Green
        $found = $true
        
        # Add to user PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notcontains $path) {
            $newPath = "$currentPath;$path"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Write-Host "Added $path to user PATH" -ForegroundColor Green
        } else {
            Write-Host "$path is already in PATH" -ForegroundColor Yellow
        }
        
        break
    }
}

if (-not $found) {
    Write-Host "PHP not found in common locations." -ForegroundColor Red
    Write-Host "Please install PHP manually and add it to PATH." -ForegroundColor Yellow
    Write-Host "Download from: https://windows.php.net/download/" -ForegroundColor Cyan
}

# Refresh current session
$env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
Write-Host "Please restart your terminal to apply changes." -ForegroundColor Cyan
