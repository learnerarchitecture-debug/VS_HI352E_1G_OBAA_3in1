package com.obaa.launcher;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Handler;
import android.os.Looper;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class Apps {
    private Apps() { }

    public static List<AppEntry> query(Context ctx) {
        PackageManager pm = ctx.getPackageManager();
        Set<String> seen = new HashSet<String>();
        List<AppEntry> out = new ArrayList<AppEntry>();
        collect(ctx, pm, new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER), seen, out);
        collect(ctx, pm, new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), seen, out);
        for (int i = out.size() - 1; i >= 0; i--) {
            if (ctx.getPackageName().equals(out.get(i).pkg)) out.remove(i);
        }
        return out;
    }

    private static void collect(Context ctx, PackageManager pm, Intent probe, Set<String> seen, List<AppEntry> out) {
        List<ResolveInfo> ris;
        try { ris = pm.queryIntentActivities(probe, 0); } catch (Exception e) { return; }
        if (ris == null) return;
        for (ResolveInfo ri : ris) {
            if (ri == null || ri.activityInfo == null) continue;
            String pkg = ri.activityInfo.packageName;
            if (pkg == null || !seen.add(pkg)) continue;
            Intent launch = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (launch == null) launch = pm.getLaunchIntentForPackage(pkg);
            if (launch == null) continue;
            String label;
            try { label = ri.loadLabel(pm).toString(); } catch (Exception e) { label = pkg; }
            out.add(new AppEntry(label, pkg, launch));
        }
    }

    public static void loadIconsInBackground(final Context ctx, final List<AppEntry> apps, final Runnable done) {
        new Thread(new Runnable() {
            @Override public void run() {
                PackageManager pm = ctx.getPackageManager();
                for (AppEntry e : apps) {
                    try { e.icon = pm.getActivityIcon(e.launch); } catch (Exception ex) { }
                }
                if (done != null) {
                    new Handler(Looper.getMainLooper()).post(done);
                }
            }
        }).start();
    }

    public static List<AppEntry> sortedByName(List<AppEntry> src) {
        final Collator col = Collator.getInstance();
        List<AppEntry> out = new ArrayList<AppEntry>(src);
        Collections.sort(out, new Comparator<AppEntry>() {
            @Override public int compare(AppEntry a, AppEntry b) {
                return col.compare(a.label == null ? "" : a.label, b.label == null ? "" : b.label);
            }
        });
        return out;
    }

    public static List<AppEntry> sortedByUsage(Context c, List<AppEntry> src) {
        final Collator col = Collator.getInstance();
        final Context ctx = c.getApplicationContext();
        List<AppEntry> out = new ArrayList<AppEntry>(src);
        Collections.sort(out, new Comparator<AppEntry>() {
            @Override public int compare(AppEntry a, AppEntry b) {
                int ua = Prefs.usage(ctx, a.pkg);
                int ub = Prefs.usage(ctx, b.pkg);
                if (ua != ub) return ub - ua;
                return col.compare(a.label == null ? "" : a.label, b.label == null ? "" : b.label);
            }
        });
        return out;
    }
}
