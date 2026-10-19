package com.obaa.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.text.format.DateFormat;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

public class SettingsActivity extends Activity {
    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout rows;
    private TextView statusValue;
    private TextView repoValue;
    private TextView lastValue;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_settings);
        rows = (LinearLayout) findViewById(R.id.rows);
        build();
        if (getIntent().getBooleanExtra("auto_check", false)) checkNow();
    }

    private int dp(float v) { return Ui.dp(this, v); }

    private LinearLayout baseRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setBackgroundResource(R.drawable.row_bg);
        row.setPadding(dp(20), dp(13), dp(20), dp(13));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(10);
        row.setLayoutParams(lp);
        return row;
    }

    private void addTitle(LinearLayout row, int stringRes) {
        TextView t = new TextView(this);
        t.setText(stringRes);
        t.setTextSize(16);
        t.setTextColor(0xFFF2F5FA);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        row.addView(t, lp);
    }

    private TextView addValue(LinearLayout row, String value) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(13);
        t.setTextColor(0xFF98A2B3);
        t.setMaxLines(1);
        t.setGravity(Gravity.END);
        row.addView(t);
        return t;
    }

    private void makeFocusable(View row, View.OnClickListener l) {
        row.setOnClickListener(l);
        Ui.focusEffect(row);
    }

    private void build() {
        LinearLayout brand = baseRow();
        addTitle(brand, R.string.brand);
        addValue(brand, getString(R.string.pill));
        rows.addView(brand);

        LinearLayout auto = baseRow();
        addTitle(auto, R.string.settings_auto_update);
        Switch s1 = new Switch(this);
        s1.setChecked(Prefs.autoUpdate(this));
        s1.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener() {
            @Override public void onCheckedChanged(android.widget.CompoundButton bv, boolean checked) {
                Prefs.setAutoUpdate(SettingsActivity.this, checked);
            }
        });
        auto.addView(s1);
        rows.addView(auto);

        LinearLayout beta = baseRow();
        addTitle(beta, R.string.settings_beta);
        Switch s2 = new Switch(this);
        s2.setChecked(Prefs.beta(this));
        s2.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener() {
            @Override public void onCheckedChanged(android.widget.CompoundButton bv, boolean checked) {
                Prefs.setBeta(SettingsActivity.this, checked);
            }
        });
        beta.addView(s2);
        rows.addView(beta);

        LinearLayout repo = baseRow();
        addTitle(repo, R.string.settings_repo);
        repoValue = addValue(repo, Prefs.repo(this));
        makeFocusable(repo, new View.OnClickListener() {
            @Override public void onClick(View v) { editRepo(); }
        });
        rows.addView(repo);

        LinearLayout check = baseRow();
        addTitle(check, R.string.settings_check_now);
        addValue(check, getString(R.string.settings_check_now));
        makeFocusable(check, new View.OnClickListener() {
            @Override public void onClick(View v) { checkNow(); }
        });
        rows.addView(check);

        LinearLayout st = baseRow();
        addTitle(st, R.string.settings_status);
        statusValue = addValue(st, "—");
        rows.addView(st);

        LinearLayout lc = baseRow();
        addTitle(lc, R.string.settings_last_checked);
        lastValue = addValue(lc, "never");
        rows.addView(lc);

        TextView note = new TextView(this);
        note.setText(R.string.settings_note);
        note.setTextSize(12);
        note.setTextColor(0xFF7E8798);
        note.setPadding(dp(6), dp(4), dp(6), dp(4));
        rows.addView(note);

        refreshStatusTexts();
    }

    private void editRepo() {
        final EditText et = new EditText(this);
        et.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        et.setText(Prefs.repo(this));
        et.setSelection(et.getText().length());
        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_repo_title)
                .setView(et)
                .setPositiveButton(R.string.dialog_repo_save, new DialogInterface.OnClickListener() {
                    @Override public void onClick(DialogInterface d, int w) {
                        String v = et.getText().toString().trim();
                        if (v.length() > 2 && v.contains("/")) {
                            Prefs.setRepo(SettingsActivity.this, v);
                            refreshStatusTexts();
                        }
                    }
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void setStatus(String s) {
        Prefs.setLastStatus(this, s);
        statusValue.setText(s);
    }

    private void checkNow() {
        setStatus(getString(R.string.status_checking));
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    final Updater.Release rel = Updater.fetch(SettingsActivity.this);
                    Prefs.setLastCheck(SettingsActivity.this, System.currentTimeMillis());
                    final String cur = Updater.currentVersion(SettingsActivity.this);
                    ui.post(new Runnable() {
                        @Override public void run() { refreshStatusTexts(); }
                    });
                    if (rel == null) {
                        ui.post(new Runnable() {
                            @Override public void run() { setStatus(getString(R.string.status_not_found)); }
                        });
                        return;
                    }
                    if (Updater.compare(rel.version, cur) <= 0) {
                        ui.post(new Runnable() {
                            @Override public void run() { setStatus(String.format(getString(R.string.status_uptodate), cur)); }
                        });
                        return;
                    }
                    ui.post(new Runnable() {
                        @Override public void run() {
                            setStatus(String.format(getString(R.string.status_update_available), rel.version));
                            if (rel.apkUrl != null) showUpdateDialog(rel);
                        }
                    });
                } catch (final Exception e) {
                    ui.post(new Runnable() {
                        @Override public void run() { setStatus(String.format(getString(R.string.status_check_failed), e.getMessage())); }
                    });
                }
            }
        }).start();
    }

    private void showUpdateDialog(final Updater.Release rel) {
        String notes = rel.notes == null ? "" : rel.notes;
        if (notes.length() > 500) notes = notes.substring(0, 500) + "…";
        new AlertDialog.Builder(this)
                .setTitle(String.format(getString(R.string.dialog_update_title), rel.version))
                .setMessage(notes)
                .setPositiveButton(R.string.dialog_update_install, new DialogInterface.OnClickListener() {
                    @Override public void onClick(DialogInterface d, int w) {
                        setStatus(String.format(getString(R.string.status_downloading), rel.version));
                        new Thread(new Runnable() {
                            @Override public void run() {
                                try {
                                    java.io.File apk = Updater.download(SettingsActivity.this, rel);
                                    Updater.install(SettingsActivity.this, apk);
                                    ui.post(new Runnable() {
                                        @Override public void run() { setStatus(String.format(getString(R.string.status_installing), rel.version)); }
                                    });
                                } catch (final Exception e) {
                                    ui.post(new Runnable() {
                                        @Override public void run() { setStatus(String.format(getString(R.string.status_install_failed), e.getMessage())); }
                                    });
                                }
                            }
                        }).start();
                    }
                })
                .setNegativeButton(R.string.dialog_update_later, null)
                .show();
    }

    private void refreshStatusTexts() {
        String s = Prefs.lastStatus(this);
        statusValue.setText(s.length() == 0 ? "—" : s);
        repoValue.setText(Prefs.repo(this));
        long t = Prefs.lastCheck(this);
        lastValue.setText(t == 0 ? "never" : DateFormat.format("dd MMM yyyy, HH:mm", t).toString());
    }
}