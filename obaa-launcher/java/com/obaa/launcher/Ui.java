package com.obaa.launcher;

import android.content.Context;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

public final class Ui {
    private Ui() { }

    public static int dp(Context c, float v) {
        return Math.round(v * c.getResources().getDisplayMetrics().density);
    }

    public static void focusEffect(final View v) {
        v.setFocusable(true);
        v.setClickable(true);
        v.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override public void onFocusChange(View view, boolean has) {
                float s = has ? 1.06f : 1f;
                view.animate().scaleX(s).scaleY(s).setDuration(150)
                        .setInterpolator(new DecelerateInterpolator()).start();
            }
        });
    }

    public static int gradientFor(String pkg) {
        int h = (pkg == null) ? 0 : pkg.hashCode();
        switch (Math.abs(h) % 6) {
            case 0: return R.drawable.grad0;
            case 1: return R.drawable.grad1;
            case 2: return R.drawable.grad2;
            case 3: return R.drawable.grad3;
            case 4: return R.drawable.grad4;
            default: return R.drawable.grad5;
        }
    }
}
