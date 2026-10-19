package com.obaa.system;

import android.content.Context;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class HardwareMonitor {
    private static final String TAG = "ObaaHwMonitor";
    private final Context context;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable monitorTask;
    private boolean running = false;
    private float cpuUsage = 0;
    private long lastTotalCpu = 0, lastIdleCpu = 0;
    private float cpuTemp = 0;
    private int usedMemMB = 0, totalMemMB = 0;

    public HardwareMonitor(Context context) {
        this.context = context;
        this.monitorTask = new Runnable() {
            @Override public void run() { collectMetrics(); }
        };
        readMemInfo();
    }

    public IBinder getBinder() {
        return new Binder() {
            @Override
            protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
                try {
                    switch (code) {
                        case 1: reply.writeFloat(cpuUsage); return true;
                        case 2: reply.writeFloat(cpuTemp); return true;
                        case 3: reply.writeInt(usedMemMB); return true;
                        case 4: reply.writeInt(totalMemMB); return true;
                        case 5: reply.writeLong(SystemClock.uptimeMillis()); return true;
                    }
                } catch (Exception e) {
                    Log.w("ObaaHwMonitor", "Transaction failed", e);
                }
                return super.onTransact(code, data, reply, flags);
            }
        };
    }

    public void startMonitoring() {
        if (!running) {
            running = true;
            handler.post(monitorTask);
        }
    }

    public void stopMonitoring() {
        running = false;
        handler.removeCallbacks(monitorTask);
    }

    private void collectMetrics() {
        if (!running) return;
        readCpuUsage();
        readCpuTemperature();
        readMemInfo();
        handler.postDelayed(monitorTask, 5000);
    }

    private void readCpuUsage() {
        try (BufferedReader br = new BufferedReader(new FileReader("/proc/stat"))) {
            String line = br.readLine();
            if (line != null && line.startsWith("cpu ")) {
                String[] parts = line.trim().split("\\s+");
                long user = Long.parseLong(parts[1]);
                long nice = Long.parseLong(parts[2]);
                long system = Long.parseLong(parts[3]);
                long idle = Long.parseLong(parts[4]);
                long iowait = parts.length > 5 ? Long.parseLong(parts[5]) : 0;
                long irq = parts.length > 6 ? Long.parseLong(parts[6]) : 0;
                long softirq = parts.length > 7 ? Long.parseLong(parts[7]) : 0;
                long steal = parts.length > 8 ? Long.parseLong(parts[8]) : 0;

                long total = user + nice + system + idle + iowait + irq + softirq + steal;
                long totalDiff = total - lastTotalCpu;
                long idleDiff = idle - lastIdleCpu;

                if (totalDiff > 0) {
                    cpuUsage = 100f * (totalDiff - idleDiff) / totalDiff;
                }
                lastTotalCpu = total;
                lastIdleCpu = idle;
            }
        } catch (Exception e) {
            Log.w("ObaaHwMonitor", "Failed to read CPU usage", e);
        }
    }

    private void readCpuTemperature() {
        String[] thermalPaths = {
            "/sys/class/thermal/thermal_zone0/temp",
            "/sys/class/thermal/thermal_zone1/temp",
            "/sys/devices/virtual/thermal/thermal_zone0/temp"
        };
        for (String path : thermalPaths) {
            try (BufferedReader br = new BufferedReader(new FileReader(path))) {
                String line = br.readLine();
                if (line != null) {
                    long temp = Long.parseLong(line.trim());
                    if (temp > 1000) temp /= 1000;
                    cpuTemp = temp;
                    break;
                }
            } catch (Exception ignored) {}
        }
    }

    private void readMemInfo() {
        try (BufferedReader br = new BufferedReader(new FileReader("/proc/meminfo"))) {
            String line;
            long total = 0, available = 0;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("MemTotal:")) {
                    total = Long.parseLong(line.split("\\s+")[1]);
                } else if (line.startsWith("MemAvailable:")) {
                    available = Long.parseLong(line.split("\\s+")[1]);
                }
            }
            totalMemMB = (int) (total / 1024);
            usedMemMB = (int) ((total - available) / 1024);
        } catch (Exception e) {
            Log.w("ObaaHwMonitor", "Failed to read meminfo", e);
        }
    }

    public float getCpuUsage() { return cpuUsage; }
    public float getCpuTemperature() { return cpuTemp; }
    public int getUsedMemoryMB() { return usedMemMB; }
    public int getTotalMemoryMB() { return totalMemMB; }
    public long getUptimeMillis() { return SystemClock.uptimeMillis(); }
}