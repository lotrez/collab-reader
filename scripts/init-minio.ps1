# PowerShell script to initialize MinIO bucket for Collab Reader
# This script waits for MinIO to be ready and creates the bucket

Write-Host "🔧 Initializing MinIO for Collab Reader..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
}

# Default values
if (-not $MINIO_ENDPOINT) { $MINIO_ENDPOINT = "localhost" }
if (-not $MINIO_API_PORT) { $MINIO_API_PORT = "9000" }
if (-not $MINIO_ROOT_USER) { $MINIO_ROOT_USER = "minioadmin" }
if (-not $MINIO_ROOT_PASSWORD) { $MINIO_ROOT_PASSWORD = "minioadmin" }
if (-not $MINIO_BUCKET_NAME) { $MINIO_BUCKET_NAME = "collab-reader" }

$MINIO_URL = "http://${MINIO_ENDPOINT}:${MINIO_API_PORT}"
$CONSOLE_PORT = if ($MINIO_CONSOLE_PORT) { $MINIO_CONSOLE_PORT } else { "9001" }

# Wait for MinIO to be ready
Write-Host "⏳ Waiting for MinIO to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "$MINIO_URL/minio/health/live" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ MinIO is ready!" -ForegroundColor Green
            break
        }
    }
    catch {
        $retryCount++
        Write-Host "   Attempt $retryCount/$maxRetries - MinIO not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ MinIO failed to start after $maxRetries attempts" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Creating bucket: $MINIO_BUCKET_NAME" -ForegroundColor Cyan

# Check if MinIO client is available
$mcPath = Get-Command mc -ErrorAction SilentlyContinue

if ($mcPath) {
    Write-Host "   Using MinIO client (mc)..." -ForegroundColor Gray
    
    # Configure alias
    & mc alias set local $MINIO_URL $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD --api S3v4
    
    # Create bucket if it doesn't exist
    $bucketExists = & mc ls "local/$MINIO_BUCKET_NAME" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ℹ️  Bucket '$MINIO_BUCKET_NAME' already exists" -ForegroundColor Yellow
    }
    else {
        & mc mb "local/$MINIO_BUCKET_NAME"
        Write-Host "   ✅ Bucket '$MINIO_BUCKET_NAME' created successfully" -ForegroundColor Green
    }
    
    # Set bucket to private
    & mc anonymous set none "local/$MINIO_BUCKET_NAME"
    Write-Host "   🔒 Bucket policy set to private" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  MinIO client (mc) not found" -ForegroundColor Yellow
    Write-Host "   Please create the bucket manually:" -ForegroundColor Yellow
    Write-Host "   1. Open http://${MINIO_ENDPOINT}:${CONSOLE_PORT}" -ForegroundColor Gray
    Write-Host "   2. Login with username: $MINIO_ROOT_USER" -ForegroundColor Gray
    Write-Host "   3. Create bucket: $MINIO_BUCKET_NAME" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ MinIO initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Access Information:" -ForegroundColor Cyan
Write-Host "   MinIO Console: http://${MINIO_ENDPOINT}:${CONSOLE_PORT}" -ForegroundColor Gray
Write-Host "   Username: $MINIO_ROOT_USER" -ForegroundColor Gray
Write-Host "   Password: $MINIO_ROOT_PASSWORD" -ForegroundColor Gray
Write-Host "   Bucket: $MINIO_BUCKET_NAME" -ForegroundColor Gray
Write-Host ""
