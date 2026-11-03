# 用独立的 Cloudflare 账号运行 wrangler，不影响本机已登录的主账号
# 用法：./cf.ps1 deploy | ./cf.ps1 whoami | ./cf.ps1 d1 create xi-mail-sub ...
# 凭据放在同目录 .cf.env（已 gitignore）：
#   CLOUDFLARE_ACCOUNT_ID=...
#   CLOUDFLARE_API_TOKEN=...            # 方式一：API Token
#   CLOUDFLARE_OAUTH_TOKEN=...          # 方式二：wrangler OAuth 令牌（配合 REFRESH_TOKEN 自动续期）
#   CLOUDFLARE_REFRESH_TOKEN=...

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$envFile = Join-Path $root '.cf.env'
if (-not (Test-Path $envFile)) {
	Write-Error "缺少 $envFile"
}

$vars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*[A-Z_]+=' } | ForEach-Object {
	$k, $v = $_ -split '=', 2
	$vars[$k.Trim()] = $v.Trim()
}

$cfHome = Join-Path $root '.cf-home'
$configDir = Join-Path $cfHome '.wrangler\config'
$configFile = Join-Path $configDir 'default.toml'

if ($vars.CLOUDFLARE_OAUTH_TOKEN -and -not (Test-Path $configFile)) {
	New-Item -ItemType Directory -Force $configDir | Out-Null
	$expire = (Get-Date).ToUniversalTime().AddMinutes(20).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
	$scopes = '"account:read", "user:read", "workers:write", "workers_kv:write", "workers_routes:write", "workers_scripts:write", "workers_tail:read", "d1:write", "zone:read", "offline_access"'
	$toml = "oauth_token = `"$($vars.CLOUDFLARE_OAUTH_TOKEN)`"`nexpiration_time = `"$expire`"`nrefresh_token = `"$($vars.CLOUDFLARE_REFRESH_TOKEN)`"`nscopes = [ $scopes ]`n"
	[System.IO.File]::WriteAllText($configFile, $toml)
}

$wrangler = Join-Path $root 'node_modules\.bin\wrangler.cmd'
if (-not (Test-Path $wrangler)) {
	Write-Error '请先在 mail-worker-sub 目录执行 npm install'
}

# 在子进程里替换用户目录，wrangler 只会读写 .cf-home 下的登录信息
$child = {
	param($cfHome, $accountId, $apiToken, $wrangler, $cwd, $argList)
	$env:USERPROFILE = $cfHome
	$env:HOME = $cfHome
	$env:XDG_CONFIG_HOME = $cfHome
	$env:CLOUDFLARE_ACCOUNT_ID = $accountId
	if ($apiToken) { $env:CLOUDFLARE_API_TOKEN = $apiToken }
	Set-Location $cwd
	& $wrangler @argList
	exit $LASTEXITCODE
}

powershell -NoProfile -Command $child -args $cfHome, $vars.CLOUDFLARE_ACCOUNT_ID, $vars.CLOUDFLARE_API_TOKEN, $wrangler, $root, $args
exit $LASTEXITCODE
