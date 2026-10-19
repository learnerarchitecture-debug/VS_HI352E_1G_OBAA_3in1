OBAA Launcher - Flash Package v1.1
==================================
Base firmware : VS_HI352E_1G (SP3531E.5 VRVT)
Launcher      : OBAA Launcher v1.1 (com.obaa.launcher, versionCode 11)
Built         : 2026-10-19

Files
-----
VS_HI352E_1G_OBAA.bin          Full firmware package - flash it exactly like
                               the original VS_HI352E_1G.bin with your usual
                               factory/update tool.
                               SHA-256:
                               781C8ACD9233EDC3B8DEEC995B2C9672FADBBD8E78EFCC94B4128BFC5BD5238F

ObaaLauncher-1.1.apk           The launcher app (already inside the .bin).
                               SHA-256:
                               88E50D07957EF29D939AEB629594C00DB4646DF08610D771491014BF323C2001

privapp-permissions-obaa.xml   Privileged permission whitelist (already
                               inside the .bin).


What changed in the firmware (system partition only)
----------------------------------------------------
+ /system/priv-app/ObaaLauncher/ObaaLauncher.apk
+ /system/etc/permissions/privapp-permissions-obaa.xml
+ /system/etc/init/obaa_perf.rc              (performance init script)
+ /system/build.prop                         (performance properties)

REMOVED (competing launchers & bloatware):
- /system/priv-app/Katniss3.7.0/      (Google TV home, 48 MB)
- /system/priv-app/Tubesky/            (Vestel launcher, 46 MB)
- /system/app/VsGooTv/                 (Competing launcher, 7.8 MB)
- /system/preinstall_apk/Netflix/      (26 MB + splits)
- /system/preinstall_apk/AmazonPrimeTv/ (35 MB)
- /system/preinstall_apk/YouTubeTv/     (45 MB)
- /system/preinstall_apk/Hotstar/       (20 MB)
- /system/preinstall_apk/DistroTv/      (6 MB)
- /system/preinstall_apk/cw_channels/   (19 MB)
- /system/product/app/VsAppstore/       (6.6 MB)
- /system/product/app/VsOTA/            (0.6 MB)
- /system/product/app/VsTvAssisant/     (5.8 MB)
- /system/product/app/TvMediaPlayer_India/ (5.7 MB)
- /system/product/app/VsUpgrade_app/    (3.5 MB)
- /system/product/app/VsIndianInput/    (1.8 MB)
- /system/app/VsHotelModel/             (5.5 MB)
- /system/app/VsTvBT/                   (9.4 MB)

Net free space gained on /system: ~400 MB


atv partition (boot splash):
----------------------------------------------------
- Replaced /bootvideo/bootanimation.zip with custom OBAA boot animation
  (modern dark theme, "OBAA" logo with accent gradient, "powered by android")


Home screen takeover
--------------------
OBAA Launcher declares HOME intent priority=100. All competing launchers
(Katniss, Tubesky, VsGooTv) have been REMOVED. OBAA is the ONLY home screen.


Launcher features (v1.1)
------------------------
- Modern dark home screen: OBAA Electronics brand, "powered by android · V1.1"
- Live TV tile → opens built-in DTV player (com.hisilicon.tvui via PLAY_DTV intent)
- "Your apps" row + full All apps grid (most-used apps sorted first)
- Quick access tiles (All apps, Settings, ...)
- Settings screen:
    * Auto update (toggle)
    * Include pre-releases (beta) channel
    * Repository (owner/name) - editable on the device, no reflash needed
    * Check for updates now / Status / Last checked
- Updates download in the background and install silently (the launcher is a
  privileged system app, so no dialogs appear).
- **Faster animations**: window/transition/animator scales set to 0.5x on boot
  for a snappier UI feel.


Performance tuning (software refresh rate / no-hang)
----------------------------------------------------
The firmware now includes aggressive performance tuning for a snappy,
hang-free experience on this 1 GB RAM / 720p device:

1. CPU / GPU governors → PERFORMANCE (locked at max frequency)
   - All 4 CPU cores: `performance` governor
   - GPU (Mali): `performance` governor
   - Thermal throttling disabled for sustained clocks

2. SurfaceFlinger (compositor) → minimum latency, max throughput
   - HWC virtual displays, latch unsignaled, no backpressure
   - Early phase offsets (500 µs) for app/GL rendering
   - Triple buffering enabled, 3 acquired buffers
   - Target: consistent 60 fps UI, no dropped frames

3. ART runtime → large heaps, JIT optimized
   - Heap growth limit: 192 MB (was 96 MB)
   - Heap size: 512 MB (was 160 MB)
   - JIT code cache: 4 MB
   - Target utilization 75%, faster GC cycles

4. Memory management
   - Low-RAM mode DISABLED (was enabled)
   - LMK (lowmemorykiller) pressures relaxed
   - App limits: max 8 bg / 12 fg starts, 20 bg apps
   - DHA (dynamic heap allocator) tuned for TV workloads
   - ZRAM swap enabled (256 MB, lz4) if kernel supports

4. System properties (build.prop)
   - ro.config.low_ram=false
   - dalvik.vm.heapsize=512m
   - debug.sf.disable_backpressure=1
   - net.tcp buffers enlarged
   - persist.sys.strictmode.disable=1
   - persist.sys.disable_rescue_party=true
   - persist.sys.logcat.enable=false

5. Init script (/system/etc/init/obaa_perf.rc)
   - Runs at late_start (after zygote)
   - Sets CPU/GPU governors, SurfaceFlinger props, ART props
   - Configures ZRAM swap
   - Runs fstrim on /data, /cache, /system
   - Disables thermal throttling, debug logging

6. Launcher-level
   - Animation scales set to 0.5x (window, transition, animator)
   - BootReceiver applies on every boot


GitHub auto-update note
-----------------------
Create a public GitHub repo (e.g. OBAA-Electronics/obaa-launcher) and publish
releases with an APK asset. The launcher checks the Releases API, compares the
version, downloads the APK and installs it silently.
The repository name defaults to "OBAA-Electronics/obaa-launcher" - edit it in
Settings on the TV if needed.


Flashing / rollback
-------------------
- Flash VS_HI352E_1G_OBAA.bin the same way you flash the original full
  firmware file.
- Rollback: flash the original VS_HI352E_1G.bin - it is untouched.


Version history
---------------
v1.1 - Initial OBAA Launcher: modern TV UI, Live TV, All apps, auto-update,
       silent installs, custom boot animation, bloatware removed,
       performance tuning (CPU/GPU governors, SurfaceFlinger, ART, ZRAM).