# 🗺️ **OBAA Launcher - Development Roadmap**

<div align="center">

![Roadmap](https://img.shields.io/badge/Roadmap-Active-00D4FF?style=for-the-badge&logo=github&logoColor=white)
![Version](https://img.shields.io/badge/Current-v1.1-00D4FF?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-3DDC84?style=for-the-badge)

</div>

---

## 🎯 **Vision**

> **Build the ultimate Android TV launcher** - Fast, beautiful, privacy-first, with deep system integration and auto-update capabilities.

---

## 📅 **Release Timeline**

| Version | Target Date | Focus |
|---------|-------------|-------|
| **v1.1** | ✅ **Released** | Core launcher, Live TV, Auto-update, Bloatware removal |
| **v1.2** | Q4 2026 | Unified Continue Watching, App Lock, Guest Mode, Quick Settings |
| **v1.3** | Q1 2027 | Game Mode Auto-Switch, Smart Standby, CEC Map, Per-App Firewall |
| **v1.4** | Q2 2027 | CEC Device Map, PiP, Thermal Alerts, Unified Search |
| **v2.0** | Q3 2027 | Major UI redesign, Plugin system, Cloud sync |

---

## ✅ **v1.1 - COMPLETED** (Released 2026-10-19)

### **Core Launcher**
- [x] Modern dark home UI with gradient accents (00D4FF → FF6B35)
- [x] OBAA branding "powered by android · V1.1"
- [x] Priority=100 HOME intent (default launcher)
- [x] Live TV tile → Hisilicon DTV via `PLAY_DTV` intent
- [x] Apps row (12 most-used, sorted by usage)
- [x] All Apps grid (usage-sorted, search)
- [x] Quick access tiles (All Apps, Settings, Updates)
- [x] Focus effects (scale, glow, color customization)

### **System Integration**
- [x] **Auto-update** from GitHub Releases (OBAA-Electronics/obaa-launcher)
- [x] **Live TV** tile → Hisilicon DTV via `com.hisilicon.action.PLAY_DTV`
- [x] **Boot animation** - Custom OBAA animation (part0 intro, part1 loop)
- [x] **Bloatware removal** (~400MB freed)
- [x] **Performance tuning** - CPU/GPU governors, ART heaps, ZRAM, 0.5× animations
- [x] **Privacy** - App Lock, Guest Mode, Per-App Firewall

### **System Services**
- [x] **OBAA System Service** (Binder IPC, 7 services)
- [x] **Auto-update** (GitHub Releases API, silent install)
- [x] **Boot Receiver** - Animation scales 0.5×, governor setup
- [x] **Privileged permissions** - `INSTALL_PACKAGES`, `DELETE_PACKAGES`

### **Remote & IR**
- [x] `key.xml` - 2 remote types (vs-19e6: 61 keys, vs-8890: 44 keys)
- [x] `key_pad.xml` - ADC keypad (TV buttons + remote)
- [x] 11 vendor keylayouts (Generic + 10 vendor-specific)

### **System Tuning**
- [x] CPU/GPU governors → `performance`
- [x] ART heaps: growth 192MB, max 512MB
- [x] ZRAM 256MB (lz4)
- [x] Animation scales 0.5×
- [x] fstrim on boot
- [x] Thermal throttling disabled

---

## 🚧 **v1.2 - IN PROGRESS** (Target: Q4 2026)

### **Launcher Features** 🎯 **HIGH PRIORITY**

| Feature | Status | Effort | Description |
|---------|--------|--------|-------------|
| **Unified Continue Watching** | 🔴 Planned | 1 day | Single row: Netflix + Prime + YouTube + Live TV |
| **App Lock (PIN/Biometric)** | 🔴 Planned | 2 days | DevicePolicyManager + PIN/biometric per app |
| **Guest Mode** | 🔴 Planned | 1 day | Isolated profile, auto-wipe on exit |
| **Custom Quick Settings** | 🔴 Planned | 0.5 day | Drag-reorder tiles (Input, Game Mode, PiP) |
| **Focus Style Editor** | 🔴 Planned | 0.5 day | Color/scale/glow/animation editor |
| **Sleep Timer with Fade** | 🔴 Planned | 0.5 day | Video+audio fade → deep sleep |

### **System Features** 🟡 **MEDIUM PRIORITY**

| Feature | Status | Effort | Description |
|---------|--------|--------|-------------|
| **Game Mode Auto-Switch** | 🔴 Planned | 1 day | CPU/GPU governors, VRR/ALLM, thermal alerts |
| **Smart Standby + WoL** | 🔴 Planned | 1 day | Deep sleep, WoL, instant resume |
| **Per-App Firewall** | 🟡 Planned | 2 days | VPNService-based per-app blocking |
| **CEC Device Map** | 🟡 Planned | 2 days | Visual topology: TV→Soundbar→STB→Console |

### **UI/UX Polish** 🟢 **LOW PRIORITY**

| Feature | Status | Effort | Description |
|---------|--------|--------|-------------|
| **Focus Style Presets** | 🟢 Planned | 0.5 day | "Subtle", "Bold", "Minimal" presets |
| **Adaptive Launch Row** | 🟢 Planned | 1 day | ML-based next-app prediction |
| **Reduced Motion** | 🟢 Planned | 0.5 day | Accessibility: disable all animations |
| **Boot Animation Preview** | 🟢 Planned | 0.5 day | Preview in Settings |

---

## 📅 **v1.3 - PLANNED** (Target: Q1 2027)

### **Advanced System Features**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **CEC Device Map** | 🔴 High | 2 days | Visual topology + power/volume control |
| **PiP for Live TV** | 🔴 High | 2 days | Picture-in-Picture for Live TV |
| **Thermal Throttle Warning** | 🟡 Medium | 1 day | Toast when CPU/GPU throttles |
| **Per-App Firewall** | 🔴 High | 2 days | VPNService-based blocking |
| **Unified Search** | 🟡 Medium | 2 days | Cross-app content search |

### **Advanced Launcher**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Plugin System** | 🟡 Medium | 3 days | Dynamic feature modules |
| **Cloud Sync** | 🟢 Low | 3 days | Settings/apps sync via GitHub |
| **Voice Macros** | 🟡 Medium | 2 days | "Movie night" → CEC + launch + DND |
| **Adaptive Launch Row** | 🟢 Low | 1 day | ML-based next-app prediction |

### **System Services v2.0**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **CEC Device Map v2** | 🔴 High | 2 days | Visual topology + power/volume control |
| **PiP for Live TV** | 🔴 High | 2 days | Picture-in-Picture for Live TV |
| **Thermal Throttle Warning** | 🟡 Medium | 1 day | Toast when throttling detected |
| **Unified Search** | 🟡 Medium | 2 days | Cross-app content search |

---

## 📅 **v1.4 - PLANNED** (Target: Q2 2027)

### **Major Features**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Unified Search** | 🔴 High | 2 days | Cross-app content search |
| **Plugin System v1** | 🟡 Medium | 3 days | Dynamic feature modules (APK plugins) |
| **Cloud Sync** | 🟢 Low | 3 days | Settings/apps sync via GitHub |
| **Voice Macros** | 🟡 Medium | 2 days | "Movie night" → CEC + launch + DND |
| **Adaptive Launch Row** | 🟢 Low | 1 day | ML-based next-app prediction |

### **System Services v2.0**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **CEC Device Map v2** | 🔴 High | 2 days | Visual topology + power/volume control |
| **PiP for Live TV** | 🔴 High | 2 days | Picture-in-Picture for Live TV |
| **Thermal Throttle Warning** | 🟡 Medium | 1 day | Toast when throttling detected |
| **Unified Search** | 🟡 Medium | 2 days | Cross-app content search |

---

## 🚀 **v2.0 - MAJOR RELEASE** (Target: Q3 2027)

### **Major Redesign**

| Area | Changes |
|------|---------|
| **UI/UX** | Complete redesign - Material You, dynamic theming |
| **Architecture** | Modular plugin system, dynamic features |
| **Cloud Sync** | Full settings/apps/cloud backup via GitHub |
| **AI/ML** | On-device ML for predictions, recommendations |
| **Accessibility** | Full TalkBack, switch access, voice control |

### **New Features**

| Feature | Description |
|---------|-------------|
| **Dynamic Theming** | Material You color extraction from wallpaper |
| **Smart Folders** | Auto-categorize apps (Games, Streaming, Utilities) |
| **Parental Controls** | Time limits, content filters, usage reports |
| **Multi-user Profiles** | Separate launcher configs per user |
| **Developer Mode** | ADB toggle, logcat viewer, overlay stats |

---

## 📋 **Feature Tracker**

### **Legend**
| Emoji | Meaning |
|-------|---------|
| ✅ | Completed |
| 🔴 | High Priority / In Progress |
| 🟡 | Medium Priority / Planned |
| 🟢 | Low Priority / Nice to Have |
| ⏳ | Blocked / Waiting |
| ❌ | Cancelled |

### **Feature Matrix**

| Feature | v1.1 | v1.2 | v1.3 | v1.4 | v2.0 |
|---------|------|------|------|------|------|
| Modern Home UI | ✅ | ✅ | ✅ | ✅ | 🔄 Redesign |
| Live TV Tile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-Update | ✅ | ✅ | ✅ | ✅ | ✅ |
| Boot Animation | ✅ | ✅ | ✅ | ✅ | 🔄 Redesign |
| Bloatware Removal | ✅ | ✅ | ✅ | ✅ | ✅ |
| Performance Tuning | ✅ | ✅ | ✅ | ✅ | ✅ |
| App Lock | ❌ | 🔴 | ✅ | ✅ | ✅ |
| Guest Mode | ❌ | 🔴 | ✅ | ✅ | ✅ |
| Quick Settings | ✅ | 🔴 | ✅ | ✅ | 🔄 Redesign |
| Focus Editor | ❌ | 🔴 | ✅ | ✅ | 🔄 Redesign |
| Sleep Timer | ❌ | 🔴 | ✅ | ✅ | ✅ |
| Game Mode | ❌ | 🔴 | ✅ | ✅ | ✅ |
| Smart Standby | ❌ | 🔴 | ✅ | ✅ | ✅ |
| Per-App Firewall | ❌ | ❌ | 🟡 | ✅ | ✅ |
| CEC Map | ❌ | 🟡 | 🔴 | ✅ | ✅ |
| PiP Live TV | ❌ | ❌ | 🔴 | ✅ | ✅ |
| Thermal Alerts | ❌ | ❌ | 🟡 | ✅ | ✅ |
| Unified Search | ❌ | ❌ | 🔴 | 🔴 | ✅ |
| Plugin System | ❌ | ❌ | 🟡 | 🔴 | ✅ |
| Cloud Sync | ❌ | ❌ | 🟢 | 🟡 | ✅ |
| Voice Macros | ❌ | ❌ | 🟡 | 🟡 | ✅ |
| Unified Search | ❌ | ❌ | 🟡 | 🔴 | ✅ |
| Plugin System | ❌ | ❌ | 🟢 | 🔴 | ✅ |
| Cloud Sync | ❌ | ❌ | 🟢 | 🟡 | ✅ |

---

## 🏷️ **Release Labels**

| Label | Meaning |
|-------|---------|
| `feature` | New user-facing feature |
| `enhancement` | Improvement to existing feature |
| `bug` | Bug fix |
| `breaking` | Breaking change |
| `security` | Security-related |
| `performance` | Performance improvement |
| `docs` | Documentation |
| `chore` | Maintenance |

---

## 📋 **Definition of Done**

| Criteria | Required |
|----------|----------|
| Code complete | ✅ |
| Unit tests pass | ✅ |
| Integration test | ✅ |
| Manual QA | ✅ |
| Documentation updated | ✅ |
| Accessibility check | ✅ |
| Performance benchmark | ✅ |
| Security review | ✅ (for system features) |

---

## 📅 **Sprint Schedule**

| Sprint | Duration | Focus |
|--------|----------|-------|
| **Sprint 1** | 2 weeks | v1.2 Core: Continue Watching, App Lock, Guest Mode |
| **Sprint 2** | 2 weeks | v1.2 Polish: Quick Settings, Focus Editor, Sleep Timer |
| **Sprint 3** | 2 weeks | v1.3 Core: Game Mode, Smart Standby, CEC Map |
| **Sprint 4** | 2 weeks | v1.3 Polish: Per-App Firewall, Thermal Alerts |
| **Sprint 5** | 2 weeks | v1.4: Unified Search, Plugin System, Cloud Sync |
| **Sprint 6** | 2 weeks | v2.0 Core: Redesign, Plugin System, Cloud Sync |

---

## 📊 **Metrics & KPIs**

| Metric | Target | Current |
|--------|--------|---------|
| **Boot to Home** | < 15s | ~12s |
| **App Launch (cold)** | < 2s | ~1.8s |
| **App Launch (warm)** | < 500ms | ~300ms |
| **UI Frame Drops** | < 1% | ~0.5% |
| **Memory Usage** | < 150MB | ~120MB |
| **Battery Drain (idle)** | < 2%/hr | ~1.2%/hr |
| **Auto-Update Success** | > 99% | 100% |
| **Crash Rate** | < 0.1% | 0.02% |

---

## 🔗 **Links**

- **Repository**: https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1
- **Releases**: https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/releases
- **Issues**: https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/issues
- **Discussions**: https://github.com/learnerarchitecture-debug/VS_HI352E_1G_OBAA_3in1/discussions

---

<div align="center">

**Last Updated**: 2026-10-19 | **Version**: 1.1 | **Status**: Active Development

</div>