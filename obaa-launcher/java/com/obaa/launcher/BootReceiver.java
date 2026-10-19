package com.obaa.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context ctx, Intent intent) {
        // Set faster animation scales (0.5x) for snappier UI
        try {
            Settings.Global.putFloat(ctx.getContentResolver(), "window_animation_scale", 0.5f);
            Settings.Global.putFloat(ctx.getContentResolver(), "transition_animation_scale", 0.5f);
            Settings.Global.putFloat(ctx.getContentResolver(), "animator_duration_scale", 0.5f);
        } catch (Exception e) { }
        
        if (!Prefs.autoUpdate(ctx)) return;
        try {
            ctx.startService(new Intent(ctx, UpdaterService.class).setAction(UpdaterService.ACTION_CHECK_SILENT));
        } catch (Exception e) { }
    }
}