package com.obaa.launcher;

import android.app.Activity;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class AllAppsActivity extends Activity {
    private final List<AppEntry> apps = new ArrayList<AppEntry>();
    private LayoutInflater inf;
    private BaseAdapter adapter;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_all_apps);
        inf = LayoutInflater.from(this);

        adapter = new BaseAdapter() {
            @Override public int getCount() { return apps.size(); }
            @Override public Object getItem(int p) { return apps.get(p); }
            @Override public long getItemId(int p) { return p; }
            @Override public View getView(int p, View convert, ViewGroup parent) {
                View v = convert != null ? convert : inf.inflate(R.layout.item_tile, parent, false);
                AppEntry e = apps.get(p);
                ImageView ic = (ImageView) v.findViewById(R.id.tile_icon);
                TextView lb = (TextView) v.findViewById(R.id.tile_label);
                if (e.icon != null) {
                    ic.setBackgroundResource(0);
                    ic.setImageDrawable(e.icon);
                } else {
                    ic.setImageDrawable(null);
                    ic.setBackgroundResource(Ui.gradientFor(e.pkg));
                }
                lb.setText(e.label);
                Ui.focusEffect(v);
                return v;
            }
        };

        GridView grid = (GridView) findViewById(R.id.grid);
        grid.setAdapter(adapter);
        grid.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override public void onItemClick(AdapterView<?> parent, View view, int pos, long id) {
                AppEntry e = apps.get(pos);
                Prefs.bumpUsage(AllAppsActivity.this, e.pkg);
                try {
                    startActivity(e.launch);
                } catch (Exception ex) {
                    Toast.makeText(AllAppsActivity.this, "Cannot open " + e.label, Toast.LENGTH_SHORT).show();
                }
            }
        });

        final List<AppEntry> loaded = Apps.query(this);
        apps.addAll(Apps.sortedByName(loaded));
        adapter.notifyDataSetChanged();
        Apps.loadIconsInBackground(this, loaded, new Runnable() {
            @Override public void run() { adapter.notifyDataSetChanged(); }
        });
    }
}
