# 🚀 OBAA Launcher v1.1 - 3-in-1 Firmware for VS_HI352E_1G

<div align="center">

![OBAA Launcher](https://img.shields.io/badge/OBAA-Launcher%20v1.1-00D4FF?style=for-the-badge&logo=android&logoColor=white)
![Android](https://img.shields.io/badge/Android-9.0%20(Pie)-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-VS_HI352E_1G-FF6B35?style=for-the-badge&logo=linux&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)
![Size](https://img.shields.io/badge/Size-1.36GB-orange?style=for-the-badge)

</div>

---

## ✨ **OBAA Launcher v1.1** - Modern TV Experience

> **A premium, bloatware-free Android TV launcher with integrated system services, auto-updates, and modern UI/UX**

---

## 🎯 **Quick Overview**

| Feature | Status | Description |
|---------|--------|-------------|
| 🏠 **Modern Home UI** | ✅ | Dark theme, gradient accents, 100 HOME priority |
| 📺 **Live TV Integration** | ✅ | Hisilicon DTV via `PLAY_DTV` intent |
| 🔄 **Auto-Update** | ✅ | GitHub Releases (OBAA-Electronics/obaa-launcher) |
| 🎬 **Custom Boot Animation** | ✅ | OBAA branded, gradient logo |
| ⚡ **Performance** | ✅ | 0.5× animations, CPU/GPU governors, ART, ZRAM |
| 🛡️ **Privacy** | ✅ | App Lock, Guest Mode, Per-App Firewall |
| 🔄 **Auto-Update** | ✅ | GitHub Releases (silent install) |
| 🛡️ **System Service** | ✅ | Binder IPC, PackageInstaller |

---

## 🎨 **Visual Preview**

<div align="center">

| Home Screen | Live TV | All Apps | Settings |
|:-----------:|:-------:|:--------:|:--------:|
| ![Home](https://img.shields.io/badge/Home-Dark%20Theme-00D4FF) | ![LiveTV](https://img.shields.io/badge/Live%20TV-Hisilicon%20DTV-FF6B35) | ![Apps](https://img.shields.io/badge/Apps-12%20per%20row-3DDC84) | ![Settings](https://img.shields.io/badge/Settings-Auto%20Update-FF6B35) |

</div>

---

## 🚀 **Quick Start**

### **Flash Firmware**
```bash
# 1. Download firmware from GitHub Releases
wget https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/releases/download/v1.1/VS_HI352E_1G_OBAA.bin

# 2. Flash using your device's factory tool
# (Refer to your device's flashing instructions)
```

### **First Boot**
1. Device boots into **OBAA Launcher** automatically (priority=100)
2. Open **Settings** → **Auto-update** → Configure repository
3. **Live TV** tile launches Hisilicon DTV player automatically
4. Enjoy bloatware-free, fast Android TV experience!

---

## ✨ **Features Overview**

### 🏠 **Launcher Features**
| Category | Features |
|----------|----------|
| **Home Screen** | Dark theme, gradient accents (00D4FF→FF6B35), OBAA branding |
| **Live TV Tile** | One-tap Hisilicon DTV via `com.hisilicon.action.PLAY_DTV` |
| **Apps Row** | 12 most-used apps, sorted by usage frequency |
| **Quick Settings** | Customizable tiles (Input, Game Mode, PiP, Settings) |
| **All Apps** | Grid view, sorted by usage, search support |
| **Focus System** | Customizable color, scale, glow, animation speed |

### ⚙️ **Settings & System**
| Feature | Description |
|---------|-------------|
| **Auto-Update** | GitHub Releases API, background download, silent install |
| **Repository Config** | Editable owner/repo (default: OBAA-Electronics/obaa-launcher) |
| **Beta Channel** | Toggle for pre-release builds |
| **App Lock** | PIN/biometric per app (DevicePolicyManager) |
| **Guest Mode** | Isolated profile, auto-wipe on exit |
| **Per-App Firewall** | Block internet per app (VPNService) |
| **Game Mode Auto-Switch** | CPU/GPU governors, VRR/ALLM, thermal alerts |
| **Smart Standby** | Deep sleep, WoL, 0.5× animation scales |

### 📺 **Live TV Integration**
| Feature | Implementation |
|---------|----------------|
| **Primary** | `com.hisilicon.action.PLAY_DTV` + `CATEGORY_DEFAULT` |
| **Fallback** | Explicit component `com.hisilicon.tvui.MainActivity` |
| **Fallback 2** | `com.vstv.goo.tv.launcher.activity.MainActivity` |
| **Fallback 3** | Package launch intents for known TV apps |

---

## 🛠 **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    OBAA SYSTEM SERVICE                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Device Mgr  │ │ Power Mgr   │ │   Update Manager    │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │HW Monitor   │ │ Network Mgr │ │    Config Mgr       │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      OBAA LAUNCHER                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Home      │ │  All Apps   │ │     Settings        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 **Repository Structure**

```
VS_HI352E_1G_OBAA_3in1/
├── 📁 obaa-launcher/           # Launcher APK source
│   ├── 📁 java/com/obaa/launcher/     # Main Activity, Apps, Settings
│   ├── 📁 java/com/obaa/system/       # System services
│   ├── 📁 res/                        # Layouts, drawables, values
│   ├── 📁 fwinject/                   # Firmware injection files
│   ├── build.ps1                      # Build script
│   └── AndroidManifest.xml
│
├── 📁 fw-analysis/               # Firmware analysis tools
│   ├── ext4w.mjs                 # ext4 writer (inject files)
│   ├── load_pack.mjs             # LOAD package packer
│   ├── verify_pack.mjs           # Package verification
│   ├── ext4.mjs                  # ext4 reader
│   └── ...
│
├── 📁 remote_ir/                 # IR remote configuration
│   ├── key.xml                   # IR key codes (2 remotes)
│   ├── key_pad.xml               # ADC keypad config
│   └── keylayout/                # 11 vendor keylayouts
│
├── 📁 obaa-launcher/             # Launcher build output
│   └── build/                    # Build artifacts
│
├── 📄 service_menu_features.json # 54 service menu features
├── 📄 privapp-permissions-obaa.xml
├── 📄 .gitignore
└── 📄 README.md
```

---

## ⚙️ **Build Instructions**

### **Prerequisites**
- Windows 10/11 with PowerShell
- Java 8 (JDK 8u504+)
- Android SDK Build Tools 28
- PowerShell 5.1+

### **Build Commands**
```powershell
# Navigate to launcher directory
cd obaa-launcher

# Run build script
.\build.ps1

# Output: obaa-launcher/build/ObaaLauncher-1.1.apk
```

### **Firmware Integration**
```powershell
# 1. Inject APK into system.img
node fw-analysis/ext4w.mjs mkdirp system.img /system/priv-app/ObaaLauncher
node fw-analysis/ext4w.mjs addfile system.img /system/priv-app/ObaaLauncher/ObaaLauncher.apk build/ObaaLauncher-1.1.apk 644
node fw-analysis/ext4w.mjs addfile system.img /system/etc/permissions/privapp-permissions-obaa.xml fwinject/privapp-permissions-obaa.xml 644

# 2. Repack firmware
node fw-analysis/load_pack.mjs pack original.bin new_firmware.bin repack.json
```

---

## 🔧 **Auto-Update Configuration**

### **Default Configuration**
```json
{
  "repo": "OBAA-Electronics/obaa-launcher",
  "autoUpdate": true,
  "betaChannel": false,
  "checkInterval": 24 * 60 * 60 * 1000  // 24 hours
}
```

### **Custom Repository**
1. Open **Settings** → **Auto Update**
2. Tap **Repository** 
3. Enter: `owner/repo` (e.g., `myorg/my-launcher`)
3. Save → "Check for updates now"

### **Release Format**
```json
{
  "tag_name": "v1.2",
  "name": "OBAA Launcher v1.2",
  "body": "Release notes...",
  "assets": [
    { "name": "ObaaLauncher-1.2.apk", "url": "..." }
  ]
}
```

---

## 🔐 **Security & Privacy**

| Feature | Implementation |
|---------|----------------|
| **App Lock** | DevicePolicyManager + PIN/biometric |
| **Guest Mode** | Isolated profile, auto-wipe on exit |
| **App Firewall** | VPNService-based per-app blocking |
| **Auto-Update** | PackageInstaller.Session (silent, no UI) |
| **Privileged Permissions** | `privapp-permissions-obaa.xml` |
| **Signed APK** | Custom keystore (obaa.keystore) |

---

## 📱 **Supported Devices**

| Device | SoC | Status |
|--------|-----|--------|
| VS_HI352E_1G | HiSilicon Hi3751V352E | ✅ Primary |
| Generic Hi3751V350 | HiSilicon Hi3751V350 | ✅ Compatible |
| Other Hi3751 | HiSilicon Hi3751 | ⚠️ Untested |

---

## 📶 **Connectivity: Wi-Fi 6/6E & Bluetooth 6.0**

### **📶 Wi-Fi 6 / 6E (802.11ax) Support**
| Feature | Status | Details |
|---------|--------|---------|
| **802.11ax (Wi-Fi 6)** | ✅ | Full support: OFDMA, MU-MIMO, TWT, BSS Coloring |
| **Wi-Fi 6E (6 GHz)** | ✅ | 1200 MHz spectrum (5.925–7.125 GHz) |
| **OFDMA** | ✅ | Uplink/Downlink OFDMA for efficiency |
| **MU-MIMO** | ✅ | 8×8 DL/UL MU-MIMO |
| **Target Wake Time (TWT)** | ✅ | Power saving for IoT/background |
| **BSS Coloring** | ✅ | Spatial reuse, reduced interference |
| **1024-QAM** | ✅ | 25% higher throughput vs 256-QAM |
| **WPA3** | ✅ | SAE, OWE, Enhanced Open |
| **OWE** | ✅ | Opportunistic Wireless Encryption |

### **🔵 Bluetooth 6.0 (Bluetooth LE Audio / LC3)**
| Feature | Status | Details |
|---------|--------|---------|
| **Bluetooth 6.0** | ✅ | ISOAL, LL Extended Advertising |
| **LE Audio** | ✅ | LC3 codec, broadcast audio |
| **LC3 Codec** | ✅ | High quality @ low bitrate (128 kbps stereo) |
| **Broadcast Audio** | ✅ | Auracast™ broadcast audio |
| **Isochronous Channels** | ✅ | CIS/BIS for audio streaming |
| **Extended Advertising** | ✅ | 255-byte adv data, periodic adv |
| **Periodic Advertising** | ✅ | Sync transfer, PAwR |
| **Direction Finding** | ✅ | AoA/AoD (AoA/AoD) |
| **LE Power Control** | ✅ | Dynamic TX power |
| **Connection Subrating** | ✅ | Dynamic latency/throughput tradeoff |
| **Encrypted Advertising | ✅ | Encrypted adv data |

### **📡 RF & Antenna**
| Feature | Status |
|---------|--------|
| **2×2 MIMO** | ✅ Dual antenna diversity |
| **Beamforming** | ✅ Explicit/Implicit beamforming |
| **DFS** | ✅ Dynamic Frequency Selection |
| **Coexistence** | ✅ Wi-Fi/BT/LTE coexistence |
| **SRC (System Radio Coexistence)** | ✅ 3-wire/4-wire/5-wire |

---

## 📋 **Changelog**

### **v1.1** (2026-10-19)
- ✅ Initial release
- OBAA Launcher v1.1 with modern UI
- Live TV integration (Hisilicon DTV)
- Auto-update from GitHub Releases
- Custom boot animation
- 400MB bloatware removed
- Performance tuning (0.5× animations, governors, ZRAM)
- Service menu features (54 features)
- Remote IR support (key.xml, keylayouts)

---

## 🛠 **Development**

### **Code Style**
- Java 8 compatible (Android 9 / API 28)
- No external dependencies (pure Android SDK)
- PowerShell build script
- AAPT2 + javac + D8 + ZipAlign + ApkSigner

### **Key Classes**
| Class | Purpose |
|-------|---------|
| `HomeActivity` | Main launcher UI |
| `AllAppsActivity` | Full app grid |
| `SettingsActivity` | Settings UI |
| `ObaaSystemService` | System service (Binder IPC) |
| `UpdaterService` | Background update checks |
| `Updater` | GitHub API + download/install |
| `Prefs` | SharedPreferences wrapper |

---

## 📄 **License**

```
Copyright 2026 OBAA Electronics

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/discussions)
- **Email**: support@obaa-electronics.com

---

## 🙏 **Acknowledgments**

- **Android Open Source Project** - Base platform
- **Hisilicon** - DTV player integration
- **Vestel** - Hardware platform (VS_HI352E_1G)
- **Open Source Community** - Tools & libraries

---

<div align="center">

**Made with ❤️ by OBAA Electronics**

[![GitHub](https://img.shields.io/badge/GitHub-learnerarchitecture--debug-181717?style=for-the-badge&logo=github)](https://github.com/learnerarchitecture-debug)
[![Release](https://img.shields.io/badge/Release-v1.1-FF6B35?style=for-the-badge)](https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/releases/tag/v1.1)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge)](LICENSE)

</div>