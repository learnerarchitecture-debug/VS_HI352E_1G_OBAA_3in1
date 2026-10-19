package com.obaa.launcher;

import android.content.Intent;
import android.graphics.drawable.Drawable;

public class AppEntry {
    public final String label;
    public final String pkg;
    public final Intent launch;
    public Drawable icon;

    public AppEntry(String label, String pkg, Intent launch) {
        this.label = label;
        this.pkg = pkg;
        this.launch = launch;
    }
}
