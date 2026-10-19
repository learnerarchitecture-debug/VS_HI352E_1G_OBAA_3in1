package com.obaa.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

public class SleepTimerManager {
    private static final String TAG = "SleepTimerManager";

    private final Context context;
    private final Prefs prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private Runnable sleepRunnable;
    private long endTime = 0;
    private boolean active = false;

    public SleepTimerManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
    }

    public boolean isEnabled() {
        return Prefs.sleepTimerEnabled(context);
    }

    public void setEnabled(boolean enabled) {
        Prefs.setSleepTimerEnabled(context, enabled);
        if (enabled) {
            startTimer(Prefs.sleepTimerDuration(context));
        } else {
            cancelTimer();
        }
    }

    public int getDurationMinutes() {
        return Prefs.sleepTimerDuration(context);
    }

    public void setDuration(int minutes) {
        Prefs.setSleepTimerDuration(context, minutes);
        if (isEnabled()) {
            cancelTimer();
            startTimer(minutes);
        }
    }

    public boolean isActive() {
        return active && System.currentTimeMillis() < endTime;
    }

    public long getRemainingMinutes() {
        if (!active) return 0;
        return Math.max(0, (endTime - System.currentTimeMillis()) / 60000);
    }

    public void startTimer(int minutes) {
        cancelTimer();
        active = true;
        endTime = System.currentTimeMillis() + minutes * 60 * 1000L;

        // Update UI periodically
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!isActive()) {
                    active = false;
                    triggerSleep();
                } else {
                    handler.postDelayed(this, 60000); // Update every minute
                }
            }
        }, 60000);
    }

    public void cancelTimer() {
        active = false;
        endTime = 0;
        handler.removeCallbacksAndMessages(null);
    }

    private void triggerSleep() {
        Log.d("SleepTimerManager", "Sleep timer triggered - putting device to sleep");
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            pm.goToSleep(System.currentTimeMillis());
        }
    }

    public int getDurationMinutes() {
        return Prefs.sleepTimerDuration(context);
    }

    public void setDuration(int minutes) {
        Prefs.setSleepTimerDuration(context, minutes);
    }

    public void setEnabled(boolean enabled) {
        Prefs.setSleepTimerEnabled(context, enabled);
        if (enabled) {
            startTimer(Prefs.sleepTimerDuration(context));
        } else {
            cancelTimer();
        }
    }
}