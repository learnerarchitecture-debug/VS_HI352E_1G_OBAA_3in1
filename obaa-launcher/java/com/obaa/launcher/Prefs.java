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
}
