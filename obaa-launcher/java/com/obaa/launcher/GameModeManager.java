package com.obaa.launcher;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.util.Log;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

public class GameModeManager {
    private static final String TAG = "GameModeManager";

    private static final String[] GAME_PACKAGES = {
            "com.pubg.imobile",
            "com.tencent.ig",
            "com.garena.game.codm",
            "com.activision.callofduty.shooter",
            "com.ea.gp.fifamobile",
            "com.riotgames.leagueoflegendsmobile",
            "com.supercell.clashroyale",
            "com.supercell.clashofclans",
            "com.mojang.minecraftpe",
            "com.roblox.client",
            "com.epicgames.fortnite",
            "com.activision.callofduty.warzone",
            "com.riotgames.valorantmobile",
            "com.netease.chainsaw",
            "com.netease.mcpe",
            "com.tencent.tmgp.sgame",
            "com.tencent.tmgp.pubgmhd",
            "com.garena.game.kgvn",
            "com.garena.game.kgth",
            "com.garena.game.kgid"
    };

    private static final String[] SYSTEM_GAME_PACKAGES = {
            "com.android.gamesdk",
            "com.google.android.play.games",
            "com.google.android.gms"
    };

    private static final String[] GOVERNOR_PERFORMANCE = {
            "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu2/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu3/cpufreq/scaling_governor",
            "/sys/class/devfreq/gpu/governor",
            "/sys/class/devfreq/ff9a0000.gpu/governor",
            "/sys/class/devfreq/ffde0000.gpu/governor"
    };

    private static final String[] GPU_GOVERNOR_PATHS = {
            "/sys/class/devfreq/gpu/governor",
            "/sys/class/devfreq/ff9a0000.gpu/governor",
            "/sys/class/devfreq/ffde0000.gpu/governor"
    };

    private final Context context;
    private final Prefs prefs;
    private boolean gameModeActive = false;

    public GameModeManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
    }

    public boolean isGameModeEnabled() {
        return Prefs.gameMode(context);
    }

    public void setGameMode(boolean enabled) {
        Prefs.setGameMode(context, enabled);
        if (enabled) {
            enableGameMode();
        } else {
            disableGameMode();
        }
    }

    public boolean isGameModeActive() {
        return gameModeActive;
    }

    public void checkAndEnableGameMode() {
        if (!Prefs.gameMode(context)) return;

        // Check if a game is running
        if (isGameRunning()) {
            enableGameMode();
        }
    }

    private boolean isGameRunning() {
        // Check for running game processes
        try {
            java.lang.Process process = Runtime.getRuntime().exec(new String[]{"ps", "-A"});
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                for (String pkg : GAME_PACKAGES) {
                    if (line.contains(pkg)) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return false;
    }

    private void enableGameMode() {
        if (gameModeActive) return;

        // Set CPU governors to performance
        for (String path : GOVERNOR_PERFORMANCE) {
            writeFile(path, "performance");
        }

        // Set GPU governor to performance
        for (String path : GPU_GOVERNOR_PATHS) {
            File file = new File(path);
            if (file.exists()) {
                writeFile(path, "performance");
            }
        }

        // Disable thermal throttling
        disableThermalThrottling();

        // Set GPU to max frequency
        setGpuMaxFrequency();

        gameModeActive = true;
        Log.d("GameModeManager", "Game Mode ENABLED");
    }

    private void disableGameMode() {
        if (!gameModeActive) return;

        // Restore CPU governors to schedutil/ondemand
        for (String path : GOVERNOR_PERFORMANCE) {
            writeFile(path, "schedutil");
        }

        // Restore GPU governor
        for (String path : GPU_GOVERNOR_PATHS) {
            File file = new File(path);
            if (file.exists()) {
                writeFile(path, "simple_ondemand");
            }
        }

        // Re-enable thermal throttling
        enableThermalThrottling();

        gameModeActive = false;
        Log.d("GameModeManager", "Game Mode DISABLED");
    }

    private void writeFile(String path, String value) {
        try {
            File file = new File(path);
            if (file.exists() && file.canWrite()) {
                FileWriter writer = new FileWriter(file);
                writer.write(value);
                writer.close();
            }
        } catch (IOException e) {
            // Ignore - may not have permission
        }
    }

    private void disableThermalThrottling() {
        try {
            File thermalDir = new File("/sys/class/thermal");
            if (thermalDir.exists()) {
                File[] zones = thermalDir.listFiles();
                if (zones != null) {
                    for (File zone : zones) {
                        if (zone.getName().startsWith("thermal_zone")) {
                            File modeFile = new File(zone, "mode");
                            if (modeFile.exists() && modeFile.canWrite()) {
                                FileWriter writer = new FileWriter(modeFile);
                                writer.write("disabled");
                                writer.close();
                            }
                        }
                    }
                }
        } catch (Exception e) {
            // Ignore
        }
    }

    private void enableThermalThrottling() {
        try {
            File thermalDir = new File("/sys/class/thermal");
            if (thermalDir.exists()) {
                File[] zones = thermalDir.listFiles();
                if (zones != null) {
                    for (File zone : zones) {
                        if (zone.getName().startsWith("thermal_zone")) {
                            File modeFile = new File(zone, "mode");
                            if (modeFile.exists() && modeFile.canWrite()) {
                                FileWriter writer = new FileWriter(modeFile);
                                writer.write("enabled");
                                writer.close();
                            }
                        }
                    }
                }
        } catch (Exception e) {
            // Ignore
        }
    }

    private void setGpuMaxFrequency() {
        try {
            File[] freqFiles = new File("/sys/class/devfreq").listFiles();
            if (freqFiles != null) {
                for (File file : freqFiles) {
                    if (file.getName().contains("gpu")) {
                        File maxFreq = new File(file, "max_freq");
                        File availFreqs = new File(file, "available_frequencies");
                        if (availFreqs.exists()) {
                            String content = readFile(availFreqs);
                            String[] freqs = content.trim().split("\\s+");
                            if (freqs.length > 0) {
                                // Set to max frequency
                                String maxFreq = freqs[freqs.length - 1];
                                writeFile(maxFreq.getAbsolutePath(), maxFreq);
                            }
                        }
                    }
                }
        } catch (Exception e) {
            // Ignore
        }
    }

    private String readFile(File file) throws IOException {
        StringBuilder sb = new StringBuilder();
        java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file));
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\n");
        }
        reader.close();
        return sb.toString();
    }
}