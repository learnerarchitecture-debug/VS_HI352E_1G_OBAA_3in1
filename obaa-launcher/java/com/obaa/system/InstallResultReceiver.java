package com.obaa.system;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.util.Log;

public class InstallResultReceiver extends BroadcastReceiver {
    private static final String TAG = "ObaaInstallReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = getResultCode();
        switch (status) {
            case PackageInstaller.STATUS_SUCCESS:
                Log.i(TAG, "Package installed successfully");
                break;
            case PackageInstaller.STATUS_FAILURE:
                Log.e(TAG, "Package install failed: " + intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
                break;
            case PackageInstaller.STATUS_FAILURE_BLOCKED:
                Log.e(TAG, "Install blocked");
                break;
            case PackageInstaller.STATUS_FAILURE_CONFLICT:
                Log.e(TAG, "Package conflict");
                break;
            case PackageInstaller.STATUS_FAILURE_INCOMPATIBLE:
                Log.e(TAG, "Package incompatible");
                break;
            case PackageInstaller.STATUS_FAILURE_STORAGE:
                Log.e(TAG, "Insufficient storage");
                break;
            default:
                Log.w(TAG, "Unknown install status: " + status);
        }
    }
}