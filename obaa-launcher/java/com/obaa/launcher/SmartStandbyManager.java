package com.obaa.launcher;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.NetworkInfo;
import android.os.PowerManager;
import android.os.Build;
import android.util.Log;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

public class SmartStandbyManager {
    private static final String TAG = "SmartStandbyManager";

    private final Context context;
    private final Prefs prefs;
    private final ConnectivityManager connectivityManager;
    private final PowerManager powerManager;
    private final BroadcastReceiver networkReceiver;
    private boolean standbyActive = false;

    public SmartStandbyManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
        this.connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        this.powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);

        this.networkReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ConnectivityManager.CONNECTIVITY_ACTION.equals(intent.getAction())) {
                    checkNetworkState();
                }
            }
        };
    }

    public boolean isSmartStandbyEnabled() {
        return Prefs.smartStandby(context);
    }

    public void setSmartStandby(boolean enabled) {
        Prefs.setSmartStandby(context, enabled);
        if (enabled) {
            enableSmartStandby();
        } else {
            disableSmartStandby();
        }
    }

    public boolean isWolEnabled() {
        return Prefs.wolEnabled(context);
    }

    public void setWolEnabled(boolean enabled) {
        Prefs.setWolEnabled(context, enabled);
    }

    public void enableSmartStandby() {
        if (standbyActive) return;

        // Register network receiver
        IntentFilter filter = new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION);
        try {
            context.registerReceiver(networkReceiver, new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));
        } catch (Exception e) {
            Log.e("SmartStandbyManager", "Failed to register network receiver", e);
        }

        // Disable thermal throttling for faster wake
        disableThermalThrottling();

        // Set CPU governors to powersave when idle
        setIdleGovernors();

        standbyActive = true;
        Log.d("SmartStandbyManager", "Smart Standby ENABLED");
    }

    public void disableSmartStandby() {
        if (!standbyActive) return;

        try {
            context.unregisterReceiver(networkReceiver);
        } catch (Exception e) {
            // Ignore
        }

        // Re-enable thermal throttling
        enableThermalThrottling();

        // Restore CPU governors
        restoreGovernors();

        standbyActive = false;
        Log.d("SmartStandbyManager", "Smart Standby DISABLED");
    }

    private void checkNetworkState() {
        NetworkInfo activeNetwork = connectivityManager.getActiveNetworkInfo();
        boolean connected = activeNetwork != null && activeNetwork.isConnected();

        if (!connected && isWolEnabled()) {
            // Network lost but WoL enabled - keep WiFi on for WoL
            // WiFi will stay active for Wake-on-LAN
        }
    }

    private void setIdleGovernors() {
        // Set CPU to powersave when screen off
        String[] cpuPaths = {
            "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu2/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu3/cpufreq/scaling_governor"
        };
        for (String path : new String[] {
                "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu2/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu3/cpufreq/scaling_governor"
        }) {
            writeFile(path, "powersave");
        }
    }

    private void restoreGovernors() {
        for (String path : new String[] {
                "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu2/cpufreq/scaling_governor",
                "/sys/devices/system/cpu/cpu3/cpufreq/scaling_governor"
        }) {
            writeFile(path, "schedutil");
        }
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
            // Ignore
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

    public void sendWakeOnLan(String macAddress) {
        // Send WoL magic packet
        new Thread(() -> {
            try {
                java.net.DatagramSocket socket = new java.net.DatagramSocket();
                socket.setBroadcast(true);
                byte[] mac = parseMac(macAddress);
                byte[] packet = new byte[102];
                for (int i = 0; i < 6; i++) packet[i] = (byte) 0xFF;
                for (int i = 1; i <= 16; i++) {
                    System.arraycopy(mac, 0, packet, i * 6, 6);
                }
                java.net.DatagramPacket packet = new java.net.DatagramPacket(
                        packet, packet.length,
                        java.net.InetAddress.getByName("255.255.255.255"), 9);
                socket.send(packet);
                socket.close();
            } catch (Exception e) {
                Log.e("SmartStandbyManager", "WoL failed", e);
            }
        }).start();
    }

    private byte[] parseMac(String mac) {
        String[] parts = mac.split("[:-]");
        byte[] bytes = new byte[6];
        for (int i = 0; i < 6; i++) {
            bytes[i] = (byte) Integer.parseInt(parts[i], 16);
        }
        return bytes;
    }

    private void writeFile(String path, String value) {
        try {
            java.io.File file = new java.io.File(path);
            if (file.exists() && file.canWrite()) {
                java.io.FileWriter writer = new java.io.FileWriter(file);
                writer.write(value);
                writer.close();
            }
        } catch (Exception e) {
            // Ignore
        }
    }
}