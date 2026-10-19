package com.obaa.system;

import android.content.Context;
import android.os.Binder;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.os.StatFs;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

public class DeviceManager {
    private final Context context;

    public DeviceManager(Context context) {
        this.context = context;
    }

    public IBinder getBinder() {
        return new Binder() {
            @Override
            protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
                if (code == 1) { // getDeviceInfo
                    reply.writeString(getDeviceInfo());
                    return true;
                }
                return super.onTransact(code, data, reply, flags);
            }
        };
    }

    public String getDeviceInfo() {
        StringBuilder sb = new StringBuilder();
        sb.append("Model: ").append(Build.MODEL).append("\n");
        sb.append("Brand: ").append(Build.BRAND).append("\n");
        sb.append("Device: ").append(Build.DEVICE).append("\n");
        sb.append("Product: ").append(Build.PRODUCT).append("\n");
        sb.append("Manufacturer: ").append(Build.MANUFACTURER).append("\n");
        sb.append("Android: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
        sb.append("Build: ").append(Build.DISPLAY).append("\n");
        sb.append("Fingerprint: ").append(Build.FINGERPRINT).append("\n");
        sb.append("Storage: ").append(getStorageInfo()).append("\n");
        return sb.toString();
    }

    private String getStorageInfo() {
        try {
            File data = Environment.getDataDirectory();
            StatFs stat = new StatFs(data.getPath());
            long blockSize = stat.getBlockSizeLong();
            long totalBlocks = stat.getBlockCountLong();
            long availBlocks = stat.getAvailableBlocksLong();
            long totalGB = (totalBlocks * blockSize) / (1024 * 1024 * 1024);
            long availGB = (availBlocks * blockSize) / (1024 * 1024 * 1024);
            return availGB + " GB free / " + totalGB + " GB total";
        } catch (Exception e) {
            return "unknown";
        }
    }

    public String getSerial() {
        try {
            return Build.getSerial();
        } catch (Exception e) {
            return "unknown";
        }
    }

    public boolean isRooted() {
        return new File("/system/bin/su").exists() || new File("/system/xbin/su").exists();
    }
}