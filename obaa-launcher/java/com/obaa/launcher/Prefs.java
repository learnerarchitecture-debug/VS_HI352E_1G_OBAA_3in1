package com.obaa.launcher;

import android.content.Context;
import android.content.SharedPreferences;

public final class Prefs {
    private static final String FILE = "obaa";
    public static final String KEY_REPO = "repo";
    public static final String KEY_AUTO = "auto_update";
    public static final String KEY_BETA = "beta";
    public static final String KEY_LAST_CHECK = "last_check";
    public static final String KEY_LAST_STATUS = "last_status";
    public static final String DEFAULT_REPO = "OBAA-Electronics/obaa-launcher";

    // v1.2 Feature flags
    public static final String KEY_APP_LOCK_ENABLED = "app_lock_enabled";
    public static final String KEY_APP_LOCK_PIN = "app_lock_pin";
    public static final String KEY_APP_LOCK_BIOMETRIC = "app_lock_biometric";
    public static final String KEY_GUEST_MODE = "guest_mode";
    public static final String KEY_FOCUS_STYLE = "focus_style";
    public static final String KEY_FOCUS_COLOR = "focus_color";
    public static final String KEY_FOCUS_SCALE = "focus_scale";
    public static final String KEY_FOCUS_GLOW = "focus_glow";
    public static final String KEY_SLEEP_TIMER_ENABLED = "sleep_timer_enabled";
    public static final String KEY_SLEEP_TIMER_DURATION = "sleep_timer_duration";
    public static final String KEY_GAME_MODE = "game_mode";
    public static final String KEY_SMART_STANDBY = "smart_standby";
    public static final String KEY_WOL_ENABLED = "wol_enabled";
    public static final String KEY_FIREWALL_ENABLED = "firewall_enabled";
    public static final String KEY_FIREWALL_APPS = "firewall_apps";
    public static final String KEY_CEC_ENABLED = "cec_enabled";
    public static final String KEY_CONTINUE_WATCHING = "continue_watching";

    private Prefs() { }

    public static SharedPreferences get(Context c) {
        return c.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    public static String repo(Context c) { return get(c).getString(KEY_REPO, DEFAULT_REPO); }
    public static void setRepo(Context c, String v) { get(c).edit().putString(KEY_REPO, v).apply(); }

    public static boolean autoUpdate(Context c) { return get(c).getBoolean(KEY_AUTO, true); }
    public static void setAutoUpdate(Context c, boolean v) { get(c).edit().putBoolean(KEY_AUTO, v).apply(); }

    public static boolean beta(Context c) { return get(c).getBoolean(KEY_BETA, false); }
    public static void setBeta(Context c, boolean v) { get(c).edit().putBoolean(KEY_BETA, v).apply(); }

    public static long lastCheck(Context c) { return get(c).getLong(KEY_LAST_CHECK, 0); }
    public static void setLastCheck(Context c, long v) { get(c).edit().putLong(KEY_LAST_CHECK, v).apply(); }

    public static String lastStatus(Context c) { return get(c).getString(KEY_LAST_STATUS, ""); }
    public static void setLastStatus(Context c, String v) { get(c).edit().putString(KEY_LAST_STATUS, v).apply(); }

    public static int usage(Context c, String pkg) { return get(c).getInt("use_" + pkg, 0); }
    public static void bumpUsage(Context c, String pkg) {
        get(c).edit().putInt("use_" + pkg, usage(c, pkg) + 1).apply();
    }

    // v1.2 Feature preferences
    public static boolean appLockEnabled(Context c) { return get(c).getBoolean(KEY_APP_LOCK_ENABLED, false); }
    public static void setAppLockEnabled(Context c, boolean v) { get(c).edit().putBoolean(KEY_APP_LOCK_ENABLED, v).apply(); }

    public static String appLockPin(Context c) { return get(c).getString(KEY_APP_LOCK_PIN, ""); }
    public static void setAppLockPin(Context c, String v) { get(c).edit().putString(KEY_APP_LOCK_PIN, v).apply(); }

    public static boolean appLockBiometric(Context c) { return get(c).getBoolean(KEY_APP_LOCK_BIOMETRIC, false); }
    public static void setAppLockBiometric(Context c, boolean v) { get(c).edit().putBoolean(KEY_APP_LOCK_BIOMETRIC, v).apply(); }

    public static boolean guestMode(Context c) { return get(c).getBoolean(KEY_GUEST_MODE, false); }
    public static void setGuestMode(Context c, boolean v) { get(c).edit().putBoolean(KEY_GUEST_MODE, v).apply(); }

    public static int focusStyle(Context c) { return get(c).getInt(KEY_FOCUS_STYLE, 0); }
    public static void setFocusStyle(Context c, int v) { get(c).edit().putInt(KEY_FOCUS_STYLE, v).apply(); }

    public static int focusColor(Context c) { return get(c).getInt(KEY_FOCUS_COLOR, 0xFF00D4FF); }
    public static void setFocusColor(Context c, int v) { get(c).edit().putInt(KEY_FOCUS_COLOR, v).apply(); }

    public static float focusScale(Context c) { return get(c).getFloat(KEY_FOCUS_SCALE, 1.15f); }
    public static void setFocusScale(Context c, float v) { get(c).edit().putFloat(KEY_FOCUS_SCALE, v).apply(); }

    public static boolean focusGlow(Context c) { return get(c).getBoolean(KEY_FOCUS_GLOW, true); }
    public static void setFocusGlow(Context c, boolean v) { get(c).edit().putBoolean(KEY_FOCUS_GLOW, v).apply(); }

    public static boolean sleepTimerEnabled(Context c) { return get(c).getBoolean(KEY_SLEEP_TIMER_ENABLED, false); }
    public static void setSleepTimerEnabled(Context c, boolean v) { get(c).edit().putBoolean(KEY_SLEEP_TIMER_ENABLED, v).apply(); }

    public static int sleepTimerDuration(Context c) { return get(c).getInt(KEY_SLEEP_TIMER_DURATION, 30); }
    public static void setSleepTimerDuration(Context c, int v) { get(c).edit().putInt(KEY_SLEEP_TIMER_DURATION, v).apply(); }

    public static boolean gameMode(Context c) { return get(c).getBoolean(KEY_GAME_MODE, false); }
    public static void setGameMode(Context c, boolean v) { get(c).edit().putBoolean(KEY_GAME_MODE, v).apply(); }

    public static boolean smartStandby(Context c) { return get(c).getBoolean(KEY_SMART_STANDBY, false); }
    public static void setSmartStandby(Context c, boolean v) { get(c).edit().putBoolean(KEY_SMART_STANDBY, v).apply(); }

    public static boolean wolEnabled(Context c) { return get(c).getBoolean(KEY_WOL_ENABLED, false); }
    public static void setWolEnabled(Context c, boolean v) { get(c).edit().putBoolean(KEY_WOL_ENABLED, v).apply(); }

    public static boolean firewallEnabled(Context c) { return get(c).getBoolean(KEY_FIREWALL_ENABLED, false); }
    public static void setFirewallEnabled(Context c, boolean v) { get(c).edit().putBoolean(KEY_FIREWALL_ENABLED, v).apply(); }

    public static String firewallApps(Context c) { return get(c).getString(KEY_FIREWALL_APPS, ""); }
    public static void setFirewallApps(Context c, String v) { get(c).edit().putString(KEY_FIREWALL_APPS, v).apply(); }

    public static boolean cecEnabled(Context c) { return get(c).getBoolean(KEY_CEC_ENABLED, false); }
    public static void setCecEnabled(Context c, boolean v) { get(c).edit().putBoolean(KEY_CEC_ENABLED, v).apply(); }

    public static boolean continueWatching(Context c) { return get(c).getBoolean(KEY_CONTINUE_WATCHING, true); }
    public static void setContinueWatching(Context c, boolean v) { get(c).edit().putBoolean(KEY_CONTINUE_WATCHING, v).apply(); }
}