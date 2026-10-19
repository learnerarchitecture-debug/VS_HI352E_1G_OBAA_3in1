# 🔨 **Building OBAA Launcher v1.2 Firmware**

## ⚠️ **IMPORTANT: Original Firmware Required**

The v1.2 firmware build requires the **original firmware binary** (`VS_HI352E_1G.bin`) which is **not in the repository** (too large for GitHub at 1.36 GB).

---

## 📋 **What You Need to Provide**

| File | Size | Source |
|-------|------|--------|
| `VS_HI352E_1G.bin` | ~1.36 GB | Original firmware from your device/manufacturer |

**Place it in the project root:**
```
VS_HI352E_1G_OBAA_3in1/
├── VS_HI352E_1G.bin          ← YOU PROVIDE THIS (1.36 GB)
├── obaa-launcher/            # Launcher source (in repo)
├── fw-analysis/              # Firmware tools (in repo)
├── remote_ir/                # IR configs (in repo)
├── .gitignore
├── README.md
├── ROADMAP.md
├── service_menu_features.json
├── privapp-permissions-obaa.xml
├── VS_HI352E_1G_OBAA_v1.1.bin  (from release)
└── VS_HI352E_1G_OBAA_v1.2.bin  (OUTPUT - generated)
```

---

## 🛠️ **Quick Build Commands**

### **1. One-Liner Build (Recommended)**
```powershell
# Place VS_HI352E_1G.bin in project root, then:
.\build_v1.2.ps1
```

### **2. Step-by-Step (if you want control)**

```powershell
# 1. Setup tools (downloads JDK, build-tools, platform, apktool)
.\setup_tools.ps1

# 2. Build v1.2 APK
cd obaa-launcher
.\build.ps1

# 3. Inject APK into system.img
node fw-analysis\ext4w.mjs mkdirp system.img /system/priv-app/ObaaLauncher
node fw-analysis\ext4w.mjs addfile system.img /system/priv-app/ObaaLauncher/ObaaLauncher.apk obaa-launcher\build\ObaaLauncher-1.2.apk 644
node fw-analysis\ext4w.mjs addfile system.img /system/etc/permissions/privapp-permissions-obaa.xml obaa-launcher\fwinject\privapp-permissions-obaa.xml 644

# 4. Repack firmware
node fw-analysis\load_pack.mjs pack VS_HI352E_1G.bin VS_HI352E_1G_OBAA_v1.2.bin repack.json
```

---

## 📦 **What You Need to Provide**

| File | Source | Required? |
|--------|--------|-----------|
| `VS_HI352E_1G.bin` | Original firmware dump | **YES** (1.36 GB) |
| GitHub Token | For auto-release | Optional (for auto-release) |

---

## 📁 **Expected Directory Structure After Build**

```
VS_HI352E_1G_OBAA_3in1/
├── VS_HI352E_1G.bin              ← YOU PROVIDE (1.36 GB)
├── VS_HI352E_1G_OBAA_v1.2.bin   ← OUTPUT (1.36 GB)
├── obaa-launcher\                # Source (in repo)
├── fw-analysis\                  # Build tools (in repo)
├── remote_ir\                    # IR configs
├── service_menu_features.json    # Service menu config
├── .gitignore
├── README.md
├── ROADMAP.md
├── service_menu_features.json
├── privapp-permissions-obaa.xml
└── .gitignore
```

---

## 🚀 **Complete Automated Build Script**

Save as `build_v1.2.ps1` and run:

```powershell
# Requires: VS_HI352E_1G.bin in project root
# Run from project root: .\build_v1.2.ps1

param(
    [switch]$Clean,
    [switch]$SkipApkBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$LauncherDir = "$ProjectRoot\obaa-launcher"
$FwDir = "$ProjectRoot\fw-analysis"
$OutputBin = "VS_HI352E_1G_OBAA_v1.2.bin"

Write-Host "=== Building OBAA v1.2 Firmware ===" -ForegroundColor Green

# 1. Build APK
if (-not $SkipApkBuild) {
    Write-Host "Building APK..." -ForegroundColor Cyan
    Push-Location obaa-launcher
    .\build.ps1
    Pop-Location
}

# 2. Check for original firmware
if (-not (Test-Path "VS_HI352E_1G.bin")) {
    Write-Error "ERROR: VS_HI352E_1G.bin not found in project root!"
    Write-Host "Please place the original firmware (VS_HI352E_1G.bin) in the project root."
    exit 1
}

# 3. Extract system.img from original firmware
Write-Host "Extracting system.img..." -ForegroundColor Cyan
node fw-analysis\load_pack.mjs extract VS_HI352E_1G.bin work_extract
Copy-Item work_extract\system.img system.img -Force

# 3. Inject APK
Write-Host "Injecting v1.2 APK..." -ForegroundColor Cyan
node fw-analysis\ext4w.mjs mkdirp system.img /system/priv-app/ObaaLauncher
node fw-analysis\ext4w.mjs addfile system.img /system/priv-app/ObaaLauncher/ObaaLauncher.apk obaa-launcher\build\ObaaLauncher-1.2.apk 644
node fw-analysis\ext4w.mjs addfile system.img /system/etc/permissions/privapp-permissions-obaa.xml obaa-launcher\fwinject\privapp-permissions-obaa.xml 644

# 4. Repack firmware
$repackJson = @{
    system = @{ path = "system.img"; sparse = $true }
} | ConvertTo-Json -Depth 10
$repackJson | Out-File "repack.json" -Encoding ascii

Write-Host "Repacking firmware..." -ForegroundColor Cyan
node fw-analysis\load_pack.mjs pack VS_HI352E_1G.bin VS_HI352E_1G_OBAA_v1.2.bin repack.json

Write-Host "✅ Build complete: VS_HI352E_1G_OBAA_v1.2.bin" -ForegroundColor Green
```

---

## 📦 **Expected Output**

```
VS_HI352E_1G_OBAA_3in1/
├── VS_HI352E_1G.bin              # Original (1.36 GB) - YOU PROVIDE
├── VS_HI352E_1G_OBAA_v1.2.bin   # OUTPUT v1.2 firmware (1.36 GB)
├── obaa-launcher\                # Source code
├── fw-analysis\                  # Build tools
├── remote_ir\                    # IR configs
├── service_menu_features.json
├── privapp-permissions-obaa.xml
├── .gitignore
├── README.md
├── ROADMAP.md
├── service_menu_features.json
├── privapp-permissions-obaa.xml
├── VS_HI352E_1G_OBAA_v1.1.bin   (v1.1 release)
└── VS_HI352E_1G_OBAA_v1.2.bin   ← NEW v1.2 FIRMWARE
```

---

## 🚀 **Quick Start (One Command)**

```powershell
# 1. Place VS_HI352E_1G.bin in project root
# 2. Run:
.\build_v1.2_simple.ps1
```

---

## 📦 **Create v1.2 Release on GitHub**

After build succeeds:

```powershell
# 1. Create release on GitHub
gh release create v1.2 \
  --title "OBAA Launcher v1.2 - 3-in-1 Firmware" \
  --notes-file RELEASE_NOTES_v1.2.md \
  VS_HI352E_1G_OBAA_v1.2.bin \
  obaa-launcher/build/ObaaLauncher-1.2.apk \
  obaa-launcher/fwinject/privapp-permissions-obaa.xml \
  README.txt
```

---

## 📋 **Pre-Build Checklist**

- [ ] `VS_HI352E_1G.bin` (1.36 GB) in project root
- [ ] `GITHUB_TOKEN` env var set (for auto-release)
- [ ] 50+ GB free disk space
- [ ] Windows 10/11, PowerShell 5.1+
- [ ] Internet access (for tool downloads)

---

## 📋 **Post-Build Checklist**

- [ ] `VS_HI352E_1G_OBAA_v1.2.bin` exists (1.36 GB)
- [ ] Firmware verified with `verify_pack.mjs`
- [ ] Release created on GitHub
- [ ] Assets uploaded (bin, apk, xml, readme)
- [ ] Auto-update tested on device