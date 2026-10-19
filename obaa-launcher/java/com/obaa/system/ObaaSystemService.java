package com.obaa.system;

import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.RemoteException;
import android.util.Log;

import java.lang.reflect.Method;

public class ObaaSystemService extends Service {
    private static final String TAG = "ObaaSystemService";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private DeviceManager deviceManager;
    private PowerManagerExt powerManager;
    private UpdateManager updateManager;
    private HardwareMonitor hardwareMonitor;
    private NetworkManager networkManager;
    private ConfigManager configManager;

    private final IBinder binder = new Binder() {
        @Override
        protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws RemoteException {
            try {
                switch (code) {
                    case 1: // getSystemStatus
                        String status = String.format("OBAA System Service v1.1 | Uptime: %d ms | CPU: %.1f%% | Mem: %d/%d MB | Temp: %.1f°C",
                            System.currentTimeMillis() - android.os.SystemClock.elapsedRealtime(),
                            hardwareMonitor.getCpuUsage(),
                            hardwareMonitor.getUsedMemoryMB(),
                            hardwareMonitor.getTotalMemoryMB(),
                            hardwareMonitor.getCpuTemperature());
                        reply.writeString(status);
                        return true;
                    case 2: // reboot
                        String reason = data.readString();
                        Log.i(TAG, "Reboot requested: " + reason);
                        mainHandler.post(new Runnable() {
                            @Override public void run() {
                                try {
                                    Class<?> pmClass = Class.forName("android.os.IPowerManager");
                                    Method asInterface = pmClass.getMethod("asInterface", IBinder.class);
                                    IBinder powerBinder = (IBinder) Class.forName("android.os.ServiceManager").getMethod("getService", String.class).invoke(null, "power");
                                    Object pm = asInterface.invoke(null, powerBinder);
                                    pm.getClass().getMethod("reboot", boolean.class, String.class, boolean.class).invoke(pm, false, reason, false);
                                } catch (Exception e) {
                                    Log.e(TAG, "Reboot failed", e);
                                }
                            }
                        });
                        return true;
                    case 3: // setCpuGovernor
                        powerManager.setCpuGovernor(data.readString());
                        return true;
                    case 4: // setGpuGovernor
                        powerManager.setGpuGovernor(data.readString());
                        return true;
                    case 5: // triggerUpdateCheck
                        updateManager.checkForUpdates();
                        return true;
                    case 6: // getConfig
                        reply.writeString(configManager.get(data.readString()));
                        return true;
                    case 7: // setConfig
                        configManager.set(data.readString(), data.readString());
                        return true;
                    case 8: // factoryReset
                        String resetReason = data.readString();
                        mainHandler.post(new Runnable() {
                            @Override public void run() {
                                try {
                                    android.os.RecoverySystem.rebootWipeUserData(ObaaSystemService.this);
                                } catch (Exception e) {
                                    Log.e(TAG, "Factory reset failed", e);
                                }
                            }
                        });
                        return true;
                    case 9: // installPackage
                        updateManager.installLocalPackage(data.readString());
                        return true;
                    case 10: // setAnimationScales
                        float scale = data.readFloat();
                        android.provider.Settings.Global.putFloat(ObaaSystemService.this.getContentResolver(), "window_animation_scale", scale);
                        android.provider.Settings.Global.putFloat(ObaaSystemService.this.getContentResolver(), "transition_animation_scale", scale);
                        android.provider.Settings.Global.putFloat(ObaaSystemService.this.getContentResolver(), "animator_duration_scale", scale);
                        return true;
                    case 11: // runShellCommand
                        String cmd = data.readString();
                        try {
                            Process p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
                            p.waitFor();
                        } catch (Exception e) {
                            Log.e(TAG, "Shell command failed: " + cmd, e);
                        }
                        return true;
                    case 12: // getSystemStatus
                        String sysStatus = String.format("OBAA System Service v1.1 | Uptime: %d ms | CPU: %.1f%% | Mem: %d/%d MB | Temp: %.1f°C",
                            System.currentTimeMillis() - android.os.SystemClock.elapsedRealtime(),
                            hardwareMonitor.getCpuUsage(),
                            hardwareMonitor.getUsedMemoryMB(),
                            hardwareMonitor.getTotalMemoryMB(),
                            hardwareMonitor.getCpuTemperature());
                        reply.writeString(sysStatus);
                        return true;
                }
            } catch (Exception e) {
                Log.e("ObaaSystemService", "Transaction failed", e);
                throw new RemoteException(e.getMessage());
            }
            return super.onTransact(code, data, reply, flags);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "OBAA System Service starting...");
        
        deviceManager = new DeviceManager(this);
        powerManager = new PowerManagerExt(this);
        updateManager = new UpdateManager(this);
        hardwareMonitor = new HardwareMonitor(this);
        networkManager = new NetworkManager(this);
        configManager = new ConfigManager(this);
        
        hardwareMonitor.startMonitoring();
        networkManager.startMonitoring();
        
        // Register services via reflection
        try {
            Class<?> smClass = Class.forName("android.os.ServiceManager");
            Method addService = smClass.getMethod("addService", String.class, IBinder.class);
            addService.invoke(null, "obaa.device", deviceManager.getBinder());
            addService.invoke(null, "obaa.power", powerManager.getBinder());
            addService.invoke(null, "obaa.update", updateManager.getBinder());
            addService.invoke(null, "obaa.hardware", hardwareMonitor.getBinder());
            addService.invoke(null, "obaa.network", networkManager.getBinder());
            addService.invoke(null, "obaa.config", configManager.getBinder());
            addService.invoke(null, "obaa.system", binder);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register services", e);
        }
        
        Log.i(TAG, "OBAA System Service started");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        hardwareMonitor.stopMonitoring();
        networkManager.stopMonitoring();
        super.onDestroy();
        Log.i(TAG, "OBAA System Service stopped");
    }
}