# Setup Super Admin for Cloudflare Workers
# This script helps configure super admin authentication

Write-Host "=== Super Admin Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get super admin login ID
$loginId = Read-Host "Enter Super Admin Login ID (e.g., 'admin' or 'superadmin')"
if ([string]::IsNullOrWhiteSpace($loginId)) {
    Write-Host "Error: Login ID cannot be empty" -ForegroundColor Red
    exit 1
}

# Get password
$password = Read-Host "Enter Super Admin Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "Error: Password cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating password hash..." -ForegroundColor Yellow

# Generate password hash using Node.js
$hashScript = @"
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(32);
  const hash = crypto.scryptSync(password, salt, 64);
  
  // Format: scrypt$N:r:p$<salt-base64>$<hash-base64>
  const N = 16384;  // CPU/memory cost
  const r = 8;      // Block size
  const p = 1;      // Parallelization
  
  const saltBase64 = salt.toString('base64');
  const hashBase64 = hash.toString('base64');
  
  return `+"`scrypt`$`${N}:`${r}:`${p}`$`${saltBase64}`$`${hashBase64}`"+`;
}

const password = process.argv[1];
console.log(hashPassword(password));
"@

$hash = node -e $hashScript $passwordPlain

if ([string]::IsNullOrWhiteSpace($hash)) {
    Write-Host "Error: Failed to generate password hash" -ForegroundColor Red
    exit 1
}

Write-Host "Password hash generated successfully!" -ForegroundColor Green
Write-Host ""

# Token version (always start with 0)
$tokenVersion = "0"

Write-Host "Setting Cloudflare Worker secrets..." -ForegroundColor Yellow
Write-Host ""

# Change to API directory
Set-Location apps/api

# Set secrets
Write-Host "Setting SUPER_ADMIN_LOGIN_ID..." -ForegroundColor Cyan
Write-Output $loginId | npx wrangler secret put SUPER_ADMIN_LOGIN_ID

Write-Host ""
Write-Host "Setting SUPER_ADMIN_PASSWORD_HASH..." -ForegroundColor Cyan
Write-Output $hash | npx wrangler secret put SUPER_ADMIN_PASSWORD_HASH

Write-Host ""
Write-Host "Setting SUPER_ADMIN_TOKEN_VERSION..." -ForegroundColor Cyan
Write-Output $tokenVersion | npx wrangler secret put SUPER_ADMIN_TOKEN_VERSION

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Super Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Login ID: $loginId"
Write-Host "  Password: (the password you entered)"
Write-Host "  Token Version: $tokenVersion"
Write-Host ""
Write-Host "IMPORTANT: Save these credentials securely!" -ForegroundColor Red
Write-Host ""
Write-Host "You can now login at:" -ForegroundColor Cyan
Write-Host "  https://a6675a80.sms-web-34u.pages.dev/super-admin/login"
Write-Host ""
Write-Host "Note: You may need to redeploy for changes to take effect:" -ForegroundColor Yellow
Write-Host "  npm run deploy"
