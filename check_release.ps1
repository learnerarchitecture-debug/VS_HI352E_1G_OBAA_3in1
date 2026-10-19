$token = $env:GITHUB_TOKEN
if (-not $token) { 
    Write-Host 'GITHUB_TOKEN not set. Please set GITHUB_TOKEN environment variable.'
    exit 1
}
$repo = 'learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1'
$headers = @{ Authorization = "token $token"; Accept = 'application/vnd.github.v3+json' }

# Check existing releases
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/releases" -Headers $headers
Write-Host "Existing releases:"
foreach ($r in $releases) {
    Write-Host "Tag: $($r.tag_name), ID: $($r.id), Draft: $($r.draft), Prerelease: $($r.prerelease)"
    foreach ($a in $r.assets) {
        Write-Host "  Asset: $($a.name) ($($a.size) bytes)"
    }
}