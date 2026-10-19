package com.obaa.launcher;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class HomeActivity extends Activity {
    private static final String[] LIVE_TV_ACTIONS = {
            "com.hisilicon.action.PLAY_DTV", "com.hisilicon.action.PLAY_ATV"
    };
    private static final ComponentName[] LIVE_TV_COMPONENTS = {
            new ComponentName("com.hisilicon.tvui", "com.hisilicon.tvui.MainActivity"),
            new ComponentName("com.vstv.goo.tv.launcher", "com.vstv.goo.tv.launcher.activity.MainActivity")
    };
    private static final String[] LIVE_TV_CANDIDATES = {
            "com.hisilicon.dtv", "com.hisilicon.tv", "com.android.tv", "com.google.android.tv",
            "com.vestel.dtv", "com.vs.dtv", "com.nstv.tv", "com.mediatek.tv"
    };

    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout appsRow;
    private LinearLayout continueRow;
    private LinearLayout toolsRow;
    private List<AppEntry> allApps = new ArrayList<AppEntry>();
    private List<AppEntry> continueApps = new ArrayList<AppEntry>();
    private boolean loaded = false;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_home);

        appsRow = (LinearLayout) findViewById(R.id.apps_row);
        continueRow = (LinearLayout) findViewById(R.id.continue_row);
        toolsRow = (LinearLayout) findViewById(R.id.tools_row);

        View watch = findViewById(R.id.watch_now);
        Ui.focusEffect(watch);
        watch.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { launchLiveTv(); }
        });
        watch.requestFocus();

        buildToolsRow();
        buildContinueRow();
        loadApps();
        maybeAutoUpdate();
    }

    @Override protected void onResume() {
        super.onResume();
        if (loaded) {
            refreshAppsRow();
            refreshContinueRow();
        }
    }

    @Override public void onBackPressed() {
        // Home: do nothing
    }

    private void maybeAutoUpdate() {
        if (!Prefs.autoUpdate(this)) return;
        long last = Prefs.lastCheck(this);
        if (System.currentTimeMillis() - last < 24L * 3600L * 1000L) return;
        try {
            startService(new Intent(this, UpdaterService.class).setAction(UpdaterService.ACTION_CHECK_SILENT));
        } catch (Exception e) { }
    }

    private void loadApps() {
        new Thread(new Runnable() {
            @Override public void run() {
                final List<AppEntry> apps = Apps.query(HomeActivity.this);
                Apps.loadIconsInBackground(HomeActivity.this, apps, new Runnable() {
                    @Override public void run() {
                        allApps = apps;
                        loaded = true;
                        refreshAppsRow();
                        buildContinueRow();
                    }
                });
            }
        }).start();
    }

    private void refreshAppsRow() {
        appsRow.removeAllViews();
        List<AppEntry> sorted = Apps.sortedByUsage(this, allApps);
        int n = Math.min(sorted.size(), 12);
        LayoutInflater inf = LayoutInflater.from(this);
        for (int i = 0; i < n; i++) {
            final AppEntry e = sorted.get(i);
            View tile = inf.inflate(R.layout.item_tile, appsRow, false);
            ImageView ic = (ImageView) tile.findViewById(R.id.tile_icon);
            TextView lb = (TextView) tile.findViewById(R.id.tile_label);
            if (e.icon != null) {
                ic.setImageDrawable(e.icon);
                ic.setBackgroundResource(0);
            } else {
                ic.setImageDrawable(null);
                ic.setBackgroundResource(Ui.gradientFor(e.pkg));
            }
            lb.setText(e.label);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tile.getLayoutParams();
            lp.rightMargin = Ui.dp(this, 14);
            tile.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { openApp(e); }
            });
            Ui.focusEffect(tile);
            appsRow.addView(tile);
        }
        if (n == 0 && loaded) {
            TextView tv = new TextView(this);
            tv.setText("No apps found");
            tv.setTextColor(0xFF98A2B3);
            appsRow.addView(tv);
        }
    }

    private void buildContinueRow() {
        if (continueRow == null) return;
        if (!Prefs.continueWatching(this)) {
            continueRow.setVisibility(View.GONE);
            return;
        }
        continueRow.setVisibility(View.VISIBLE);
        continueRow.removeAllViews();

        // Add header
        TextView header = new TextView(this);
        header.setText(R.string.continue_watching);
        header.setTextSize(18);
        header.setTextColor(0xFFF2F5FA);
        header.setPadding(Ui.dp(this, 20), Ui.dp(this, 10), Ui.dp(this, 20), Ui.dp(this, 10));
        continueRow.addView(header);

        // Build continue watching apps
        List<AppEntry> recent = getRecentApps(6);
        if (recent.isEmpty()) {
            TextView tv = new TextView(this);
            tv.setText(R.string.continue_watching_empty);
            tv.setTextColor(0xFF98A2B3);
            tv.setPadding(Ui.dp(this, 20), Ui.dp(this, 20), Ui.dp(this, 20), Ui.dp(this, 20));
            continueRow.addView(tv);
            return;
        }

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rlp.bottomMargin = Ui.dp(this, 10);
        row.setLayoutParams(rlp);

        LayoutInflater inf = LayoutInflater.from(this);
        for (AppEntry e : getRecentApps(6)) {
            View tile = inf.inflate(R.layout.item_tile, null);
            ImageView ic = (ImageView) tile.findViewById(R.id.tile_icon);
            TextView lb = (TextView) tile.findViewById(R.id.tile_label);
            if (e.icon != null) {
                ic.setImageDrawable(e.icon);
                ic.setBackgroundResource(0);
            } else {
                ic.setImageDrawable(null);
                ic.setBackgroundResource(Ui.gradientFor(e.pkg));
            }
            lb.setText(e.label);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tile.getLayoutParams();
            lp.width = Ui.dp(this, 116);
            lp.height = Ui.dp(this, 116);
            lp.rightMargin = Ui.dp(this, 14);
            tile.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { openApp(e); }
            });
            Ui.focusEffect(tile);
            row.addView(tile);
        }
        continueRow.addView(row);
    }

    private void refreshContinueRow() {
        if (continueRow != null) {
            buildContinueRow();
        }
    }

    private List<AppEntry> getRecentApps(int limit) {
        List<AppEntry> recent = new ArrayList<AppEntry>();
        List<AppEntry> sorted = Apps.sortedByUsage(this, allApps);
        for (int i = 0; i < Math.min(limit, sorted.size()); i++) {
            recent.add(sorted.get(i));
        }
        return recent;
    }

    @Override protected void onResume() {
        super.onResume();
        if (loaded) {
            refreshAppsRow();
            refreshContinueRow();
        }
    }

    @Override public void onBackPressed() {
    }

    private void maybeAutoUpdate() {
        if (!Prefs.autoUpdate(this)) return;
        long last = Prefs.lastCheck(this);
        if (System.currentTimeMillis() - last < 24L * 3600L * 1000L) return;
        try {
            startService(new Intent(this, UpdaterService.class).setAction(UpdaterService.ACTION_CHECK_SILENT));
        } catch (Exception e) { }
    }

    private void loadApps() {
        new Thread(new Runnable() {
            @Override public void run() {
                final List<AppEntry> apps = Apps.query(HomeActivity.this);
                Apps.loadIconsInBackground(HomeActivity.this, apps, new Runnable() {
                    @Override public void run() {
                        allApps = apps;
                        loaded = true;
                        refreshAppsRow();
                        buildContinueRow();
                    }
                });
            }
        }).start();
    }

    private void refreshAppsRow() {
        appsRow.removeAllViews();
        List<AppEntry> sorted = Apps.sortedByUsage(this, allApps);
        int n = Math.min(sorted.size(), 12);
        LayoutInflater inf = LayoutInflater.from(this);
        for (int i = 0; i < n; i++) {
            final AppEntry e = sorted.get(i);
            View tile = LayoutInflater.from(this).inflate(R.layout.item_tile, appsRow, false);
            ImageView ic = (ImageView) tile.findViewById(R.id.tile_icon);
            TextView lb = (TextView) tile.findViewById(R.id.tile_label);
            if (e.icon != null) {
                ic.setImageDrawable(e.icon);
                ic.setBackgroundResource(0);
            } else {
                ic.setImageDrawable(null);
                ic.setBackgroundResource(Ui.gradientFor(e.pkg));
            }
            lb.setText(e.label);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tile.getLayoutParams();
            lp.rightMargin = Ui.dp(this, 14);
            tile.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { openApp(e); }
            });
            Ui.focusEffect(tile);
            appsRow.addView(tile);
        }
        if (n == 0 && loaded) {
            TextView tv = new TextView(this);
            tv.setText("No apps found");
            tv.setTextColor(0xFF98A2B3);
            appsRow.addView(tv);
        }
    }

    private void buildToolsRow() {
        LinearLayout row = (LinearLayout) findViewById(R.id.tools_row);
        addTool(row, "All apps", R.drawable.grad4, new Runnable() {
            @Override public void run() { startActivity(new Intent(HomeActivity.this, AllAppsActivity.class)); }
        });
        addTool(row, "Settings", R.drawable.grad3, new Runnable() {
            @Override public void run() { startActivity(new Intent(HomeActivity.this, SettingsActivity.class)); }
        });
        addTool(row, "Updates", R.drawable.grad2, new Runnable() {
            @Override public void run() { startActivity(new Intent(this, SettingsActivity.class).putExtra("auto_check", true)); }
        });
        addTool(row, "Live TV", R.drawable.grad5, new Runnable() {
            @Override public void run() { launchLiveTv(); }
        });
    }

    private void addTool(LinearLayout row, String label, int gradient, final Runnable action) {
        View tile = LayoutInflater.from(this).inflate(R.layout.item_tile, row, false);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tile.getLayoutParams();
        lp.width = Ui.dp(this, 116);
        lp.height = Ui.dp(this, 116);
        lp.rightMargin = Ui.dp(this, 14);
        ImageView ic = (ImageView) tile.findViewById(R.id.tile_icon);
        ic.setImageDrawable(null);
        ic.setBackgroundResource(gradient);
        TextView lb = (TextView) tile.findViewById(R.id.tile_label);
        lb.setText(label);
        tile.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { action.run(); }
        });
        Ui.focusEffect(tile);
        row.addView(tile);
    }

    private void launchLiveTv() {
        for (String action : LIVE_TV_ACTIONS) {
            Intent i = new Intent(action).addCategory(Intent.CATEGORY_DEFAULT);
            try {
                ResolveInfo ri = getPackageManager().resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY);
                if (ri != null && ri.activityInfo != null) {
                    i.setClassName(ri.activityInfo.packageName, ri.activityInfo.name);
                    startActivity(i);
                    return;
                }
            } catch (Exception e) { }
        }
        for (ComponentName cn : LIVE_TV_COMPONENTS) {
            try {
                Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
                i.setComponent(cn);
                startActivity(i);
                return;
            } catch (Exception e) { }
        }
        PackageManager pm = getPackageManager();
        for (String p : LIVE_TV_CANDIDATES) {
            Intent i = pm.getLaunchIntentForPackage(p);
            if (i != null) {
                try { startActivity(i); return; } catch (Exception e) { }
            }
        }
        Toast.makeText(this, "Open Live TV from All apps", Toast.LENGTH_SHORT).show();
        startActivity(new Intent(this, AllAppsActivity.class));
    }

    private void openApp(AppEntry e) {
        Prefs.bumpUsage(this, e.pkg);
        try { startActivity(e.launch); } catch (Exception ex) {
            Toast.makeText(this, "Cannot open " + e.label, Toast.LENGTH_SHORT).show();
        }
    }

    private void addTool(LinearLayout row, String label, int gradient, final Runnable action) {
        View tile = LayoutInflater.from(this).inflate(R.layout.item_tile, row, false);
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) tile.getLayoutParams();
        lp.width = Ui.dp(this, 116);
        lp.height = Ui.dp(this, 116);
        lp.rightMargin = Ui.dp(this, 14);
        ImageView ic = (ImageView) tile.findViewById(R.id.tile_icon);
        ic.setImageDrawable(null);
        ic.setBackgroundResource(gradient);
        TextView lb = (TextView) tile.findViewById(R.id.tile_label);
        lb.setText(label);
        tile.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { action.run(); }
        });
        Ui.focusEffect(tile);
        row.addView(tile);
    }
}