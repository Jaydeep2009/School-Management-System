# Reset Super Admin Password
# Run this from the project root

Write-Host "=== Reset Super Admin Password ===" -ForegroundColor Cyan
Write-Host ""

# Get new password
$password = Read-Host "Enter NEW Super Admin Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "Error: Password cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting SUPER_ADMIN_PASSWORD secret..." -ForegroundColor Yellow

# Change to API directory
Set-Location apps/api

# Set the secret
Write-Output $passwordPlain | npx wrangler secret put SUPER_ADMIN_PASSWORD

Write-Host ""
Write-Host "=== Password Reset Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your new password has been set!" -ForegroundColor Yellow
Write-Host "You can now login at:" -ForegroundColor Cyan
Write-Host "  https://6ec9942a.sms-web-34u.pages.dev/super-admin/login"
Write-Host ""
Write-Host "Use this password: (the one you just entered)" -ForegroundColor Yellow
