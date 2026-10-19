package com.obaa.system;

import android.content.Context;
import android.os.Binder;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Method;

public class PowerManagerExt {
    private static final String TAG = "ObaaPowerManager";
    private final Context context;
    private final PowerManager pm;
    private final String[] cpuPaths;

    public PowerManagerExt(Context context) {
        this.context = context;
        this.pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        this.cpuPaths = new String[]{
            "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu2/cpufreq/scaling_governor",
            "/sys/devices/system/cpu/cpu3/cpufreq/scaling_governor"
        };
    }

    public android.os.IBinder getBinder() {
        return new android.os.Binder() {
            @Override
            protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
                try {
                    switch (code) {
                        case 1: // setCpuGovernor
                            setCpuGovernor(data.readString());
                            reply.writeNoException();
                            return true;
                        case 2: // setGpuGovernor
                            setGpuGovernor(data.readString());
                            reply.writeNoException();
                            return true;
                        case 3: // disableThermalThrottling
                            disableThermalThrottling();
                            reply.writeNoException();
                            return true;
                        case 4: // reboot
                            reboot(data.readString());
                            reply.writeNoException();
                            return true;
                    }
                } catch (Exception e) {
                    android.util.Log.e("ObaaPowerManager", "Transaction failed", e);
                }
                return super.onTransact(code, data, reply, flags);
            }
        };
    }

    public void setCpuGovernor(String governor) {
        for (String path : cpuPaths) {
            writeFile(path, governor);
        }
        Log.i("ObaaPowerManager", "CPU governor set to: " + governor);
    }

    public void setGpuGovernor(String governor) {
        String[] gpuPaths = {
            "/sys/class/devfreq/gpu/governor",
            "/sys/class/devfreq/ff9a0000.gpu/governor",
            "/sys/class/devfreq/ffde0000.gpu/governor",
            "/sys/class/devfreq/ff9a0000.mali/governor"
        };
        for (String path : gpuPaths) {
            if (new java.io.File(path).exists()) {
                writeFile(path, governor);
                Log.i("ObaaPowerManager", "GPU governor set to: " + governor + " at " + path);
                break;
            }
        }
    }

    public void disableThermalThrottling() {
        java.io.File thermalDir = new java.io.File("/sys/class/thermal");
        if (thermalDir.exists()) {
            for (java.io.File zone : thermalDir.listFiles()) {
                if (zone.getName().startsWith("thermal_zone")) {
                    writeFile(zone.getPath() + "/mode", "disabled");
                }
            }
        }
        Log.i("ObaaPowerManager", "Thermal throttling disabled");
    }

    public void acquireWakeLock(String tag) {
        android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
        android.os.PowerManager.WakeLock wl = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "OBAA:" + tag);
        wl.acquire();
    }

    public void releaseWakeLock(android.os.PowerManager.WakeLock wl) {
        if (wl != null && wl.isHeld()) wl.release();
    }

    public void reboot(String reason) {
        try {
            java.lang.reflect.Method m = android.os.PowerManager.class.getMethod("reboot", String.class);
            m.invoke(pm, reason);
        } catch (Exception e) {
            Log.e("ObaaPowerManager", "Reboot failed", e);
        }
    }

    private void writeFile(String path, String value) {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            bw.write(value);
        } catch (IOException e) {
            // Silently ignore
        }
    }
}