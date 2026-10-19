package com.obaa.system;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Binder;
import android.os.IBinder;
import android.util.Log;

public class ConfigManager {
    private static final String TAG = "ObaaConfigManager";
    private static final String PREFS_NAME = "obaa_system_config";
    private final SharedPreferences prefs;

    public ConfigManager(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        setDefault("cpu_governor", "performance");
        setDefault("gpu_governor", "performance");
        setDefault("animation_scale", "0.5");
        setDefault("auto_update", "true");
        setDefault("beta_channel", "false");
        setDefault("update_repo", "OBAA-Electronics/obaa-launcher");
        setDefault("kiosk_mode", "false");
        setDefault("adb_enabled", "true");
        setDefault("log_level", "info");
    }

    public IBinder getBinder() {
        return new Binder() {
            @Override
            protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
                try {
                    switch (code) {
                        case 1: // get
                            reply.writeString(get(data.readString()));
                            return true;
                        case 2: // set
                            set(data.readString(), data.readString());
                            reply.writeNoException();
                            return true;
                        case 3: // getBoolean
                            reply.writeInt(getBoolean(data.readString(), false) ? 1 : 0);
                            return true;
                        case 4: // setBoolean
                            setBoolean(data.readString(), data.readInt() != 0);
                            reply.writeNoException();
                            return true;
                        case 5: // getInt
                            reply.writeInt(getInt(data.readString(), 0));
                            return true;
                        case 6: // setInt
                            setInt(data.readString(), data.readInt());
                            reply.writeNoException();
                            return true;
                    }
                } catch (Exception e) {
                    Log.w("ObaaConfigManager", "Transaction failed", e);
                }
                return super.onTransact(code, data, reply, flags);
            }
        };
    }

    private void setDefault(String key, String value) {
        if (!prefs.contains(key)) {
            prefs.edit().putString(key, value).apply();
        }
    }

    public String get(String key) {
        return prefs.getString(key, "");
    }

    public void set(String key, String value) {
        prefs.edit().putString(key, value).apply();
        Log.i(TAG, "Config set: " + key + " = " + value);
    }

    public boolean getBoolean(String key, boolean def) {
        return prefs.getBoolean(key, def);
    }

    public void setBoolean(String key, boolean value) {
        prefs.edit().putBoolean(key, value).apply();
    }

    public int getInt(String key, int def) {
        return prefs.getInt(key, def);
    }

    public void setInt(String key, int value) {
        prefs.edit().putInt(key, value).apply();
    }
}