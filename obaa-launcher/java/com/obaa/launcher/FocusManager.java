package com.obaa.launcher;

import android.content.Context;
import android.graphics.Color;

public class FocusManager {
    private static final String TAG = "FocusManager";

    private final Context context;
    private final Prefs prefs;

    public FocusManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
    }

    public int getFocusStyle() {
        return Prefs.focusStyle(context);
    }

    public void setFocusStyle(int style) {
        Prefs.setFocusStyle(context, style);
    }

    public int getFocusColor() {
        return Prefs.focusColor(context);
    }

    public void setFocusColor(int color) {
        Prefs.setFocusColor(context, color);
    }

    public float getFocusScale() {
        return Prefs.focusScale(context);
    }

    public void setFocusScale(float scale) {
        Prefs.setFocusScale(context, scale);
    }

    public boolean isGlowEnabled() {
        return Prefs.focusGlow(context);
    }

    public void setGlowEnabled(boolean enabled) {
        Prefs.setFocusGlow(context, enabled);
    }

    public int getFocusColorRes() {
        int style = getFocusStyle();
        switch (style) {
            case 0: return 0xFF00D4FF; // Subtle - Blue
            case 1: return 0xFFFF6B35; // Bold - Orange
            case 2: return 0xFF00D4FF; // Minimal - Blue
            default: return 0xFF00D4FF;
        }
    }

    public float getFocusScaleValue() {
        return Prefs.focusScale(context);
    }

    public boolean isGlowEnabled() {
        return Prefs.focusGlow(context);
    }

    public void applyFocusStyle(View view) {
        int color = getFocusColor();
        float scale = getFocusScale();
        boolean glow = isGlowEnabled();

        // Apply scale animation
        view.setScaleX(1.0f);
        view.setScaleY(1.0f);
        view.animate().scaleX(getFocusScale()).scaleY(getFocusScale()).setDuration(150).start();

        // Apply glow effect if enabled
        if (isGlowEnabled()) {
            // Add glow effect via background or outline
        }
    }
}