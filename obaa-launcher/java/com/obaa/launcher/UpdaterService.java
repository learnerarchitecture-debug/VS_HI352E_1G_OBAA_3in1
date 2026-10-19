package com.obaa.launcher;

import android.app.IntentService;
import android.content.Intent;

import java.io.File;

public class UpdaterService extends IntentService {
    public static final String ACTION_CHECK_SILENT = "com.obaa.launcher.CHECK_SILENT";

    public UpdaterService() {
        super("ObaaUpdater");
    }

    @Override protected void onHandleIntent(Intent intent) {
        try {
            Updater.Release rel = Updater.fetch(this);
            Prefs.setLastCheck(this, System.currentTimeMillis());
            if (rel == null) {
                Prefs.setLastStatus(this, "No releases found");
                return;
            }
            String cur = Updater.currentVersion(this);
            if (Updater.compare(rel.version, cur) <= 0) {
                Prefs.setLastStatus(this, "Up to date — v" + cur);
                return;
            }
            Prefs.setLastStatus(this, "Update available: v" + rel.version);
            if (rel.apkUrl != null) {
                File apk = Updater.download(this, rel);
                Updater.install(this, apk);
                Prefs.setLastStatus(this, "Installing v" + rel.version + "…");
            }
        } catch (Exception e) {
            Prefs.setLastStatus(this, "Check failed: " + e.getMessage());
        }
    }
}
