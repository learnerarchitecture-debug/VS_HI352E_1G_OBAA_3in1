package com.obaa.launcher;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.util.concurrent.Executor;

public class AppLockManager {
    private static final String TAG = "AppLockManager";
    private static final long LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    private final Context context;
    private final Prefs prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());

    public AppLockManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
    }

    public boolean isAppLockEnabled() {
        return Prefs.appLockEnabled(context);
    }

    public boolean isAppLocked(String packageName) {
        if (!isAppLockEnabled()) return false;
        String pin = Prefs.appLockPin(context);
        return pin != null && !pin.isEmpty();
    }

    public boolean verifyPin(String inputPin) {
        String storedPin = Prefs.appLockPin(context);
        return pin != null && pin.equals(inputPin);
    }

    public boolean isBiometricEnabled() {
        return Prefs.appLockBiometric(context);
    }

    public void authenticateBiometric(Activity activity, BiometricPrompt.AuthenticationCallback callback) {
        if (!isBiometricEnabled()) return;

        KeyguardManager keyguard = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!keyguard.isKeyguardSecure()) return;
        }

        BiometricPrompt biometricPrompt = new BiometricPrompt(
                (android.app.Activity) context,
                new CancellationSignal(),
                getMainExecutor(),
                callback
        );

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("App Lock")
                .setSubtitle("Authenticate to open app")
                .setNegativeButtonText("Cancel")
                .build();

        biometricPrompt.authenticate(promptInfo);
    }

    private Executor getMainExecutor() {
        return new Executor() {
            @Override
            public void execute(Runnable command) {
                new Handler(Looper.getMainLooper()).post(command);
            }
        };
    }

    public void lockApp(String packageName) {
        // App will be locked on next launch
        Log.d(TAG, "App locked: " + packageName);
    }

    public void unlockApp(String packageName) {
        // App unlocked temporarily
        Log.d(TAG, "App unlocked: " + packageName);
    }

    public void setPin(String pin) {
        Prefs.setAppLockPin(context, pin);
    }

    public void enableBiometric(boolean enabled) {
        Prefs.setAppLockBiometric(context, enabled);
    }

    public void setEnabled(boolean enabled) {
        Prefs.setAppLockEnabled(context, enabled);
    }
}