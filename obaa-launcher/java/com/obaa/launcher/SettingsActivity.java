package com.obaa.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.UserManager;
import android.provider.Settings;
import android.text.InputType;
import android.text.format.DateFormat;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;
import java.util.concurrent.Executor;

public class SettingsActivity extends Activity {
    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout rows;
    private TextView statusValue;
    private TextView repoValue;
    private TextView lastValue;

    private AppLockManager appLockManager;
    private GuestModeManager guestModeManager;
    private FocusManager focusManager;
    private SleepTimerManager sleepTimerManager;
    private GameModeManager gameModeManager;
    private SmartStandbyManager smartStandbyManager;
    private FirewallManager firewallManager;
    private CecManager cecManager;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_settings);

        appLockManager = new AppLockManager(this);
        guestModeManager = new GuestModeManager(this);
        focusManager = new FocusManager(this);
        sleepTimerManager = new SleepTimerManager(this);
        gameModeManager = new GameModeManager(this);
        smartStandbyManager = new SmartStandbyManager(this);
        firewallManager = new FirewallManager(this);
        cecManager = new CecManager(this);

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

        // --- Auto Update Section ---
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

        // --- App Lock Section ---
        addSectionHeader(R.string.settings_app_lock, R.string.settings_app_lock_summary);
        LinearLayout appLock = baseRow();
        addTitle(appLock, R.string.settings_app_lock);
        Switch appLockSwitch = new Switch(this);
        appLockSwitch.setChecked(Prefs.appLockEnabled(this));
        appLockSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setAppLockEnabled(this, isChecked);
        });
        appLock.addView(appLockSwitch);
        makeFocusable(appLock, v -> editAppLockPin());
        rows.addView(appLock);

        LinearLayout biometric = baseRow();
        addTitle(biometric, R.string.settings_app_lock_biometric);
        Switch bioSwitch = new Switch(this);
        bioSwitch.setChecked(Prefs.appLockBiometric(this));
        bioSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setAppLockBiometric(this, isChecked);
        });
        biometric.addView(bioSwitch);
        rows.addView(biometric);

        // --- Guest Mode ---
        addSectionHeader(R.string.settings_guest_mode, R.string.settings_guest_mode_summary);
        LinearLayout guestMode = baseRow();
        addTitle(guestMode, R.string.settings_guest_mode);
        Switch guestSwitch = new Switch(this);
        guestSwitch.setChecked(Prefs.guestMode(this));
        guestSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setGuestMode(this, isChecked);
            if (isChecked) {
                new GuestModeManager(this).startGuestSession(this);
            } else {
                new GuestModeManager(this).exitGuestMode(this);
            }
        });
        guestMode.addView(guestSwitch);
        rows.addView(guestMode);

        // --- Focus Style ---
        addSectionHeader(R.string.settings_focus_style, R.string.settings_focus_style_summary);
        LinearLayout focusStyle = baseRow();
        addTitle(focusStyle, R.string.settings_focus_style);
        makeFocusable(focusStyle, v -> showFocusStyleDialog());
        rows.addView(focusStyle);

        // --- Sleep Timer ---
        addSectionHeader(R.string.settings_sleep_timer, R.string.settings_sleep_timer_summary);
        LinearLayout sleepTimer = baseRow();
        addTitle(sleepTimer, R.string.settings_sleep_timer);
        Switch sleepSwitch = new Switch(this);
        sleepSwitch.setChecked(Prefs.sleepTimerEnabled(this));
        sleepSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setSleepTimerEnabled(this, isChecked);
            SleepTimerManager stm = new SleepTimerManager(this);
            if (isChecked) stm.setDuration(Prefs.sleepTimerDuration(this));
        });
        sleepTimer.addView(sleepSwitch);
        makeFocusable(sleepTimer, v -> showSleepTimerDialog());
        rows.addView(sleepTimer);

        // --- Game Mode ---
        addSectionHeader(R.string.settings_game_mode, R.string.settings_game_mode_summary);
        LinearLayout gameMode = baseRow();
        addTitle(gameMode, R.string.settings_game_mode);
        Switch gameModeSwitch = new Switch(this);
        gameModeSwitch.setChecked(Prefs.gameMode(this));
        gameModeSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setGameMode(this, isChecked);
            GameModeManager gmm = new GameModeManager(this);
            if (isChecked) gmm.enableGameMode();
            else gmm.disableGameMode();
        });
        gameMode.addView(gameModeSwitch);
        rows.addView(gameMode);

        // --- Smart Standby ---
        addSectionHeader(R.string.settings_smart_standby, R.string.settings_smart_standby_summary);
        LinearLayout smartStandby = baseRow();
        addTitle(smartStandby, R.string.settings_smart_standby);
        Switch ssSwitch = new Switch(this);
        ssSwitch.setChecked(Prefs.smartStandby(this));
        ssSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setSmartStandby(this, isChecked);
            SmartStandbyManager ssm = new SmartStandbyManager(this);
            if (isChecked) ssm.enableSmartStandby();
            else ssm.disableSmartStandby();
        });
        smartStandby.addView(ssSwitch);
        rows.addView(smartStandby);

        LinearLayout wol = baseRow();
        addTitle(wol, R.string.settings_wol);
        Switch wolSwitch = new Switch(this);
        wolSwitch.setChecked(Prefs.wolEnabled(this));
        wolSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setWolEnabled(this, isChecked);
        });
        wol.addView(wolSwitch);
        rows.addView(wol);

        // --- Firewall ---
        addSectionHeader(R.string.settings_firewall, R.string.settings_firewall_summary);
        LinearLayout firewall = baseRow();
        addTitle(firewall, R.string.settings_firewall);
        Switch fwSwitch = new Switch(this);
        fwSwitch.setChecked(Prefs.firewallEnabled(this));
        fwSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setFirewallEnabled(this, isChecked);
            FirewallManager fm = new FirewallManager(this);
            if (isChecked) fm.enableFirewall();
            else fm.disableFirewall();
        });
        firewall.addView(fwSwitch);
        makeFocusable(firewall, v -> showFirewallDialog());
        rows.addView(firewall);

        // --- CEC Device Map ---
        addSectionHeader(R.string.settings_cec, R.string.settings_cec_summary);
        LinearLayout cec = baseRow();
        addTitle(cec, R.string.settings_cec);
        Switch cecSwitch = new Switch(this);
        cecSwitch.setChecked(Prefs.cecEnabled(this));
        cecSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setCecEnabled(this, isChecked);
            CecManager cm = new CecManager(this);
            if (isChecked) cm.enableCec();
            else cm.disableCec();
        });
        cec.addView(cecSwitch);
        makeFocusable(cec, v -> showCecDialog());
        rows.addView(cec);

        // --- Continue Watching ---
        addSectionHeader(R.string.settings_continue_watching, R.string.settings_continue_watching_summary);
        LinearLayout cw = baseRow();
        addTitle(cw, R.string.settings_continue_watching);
        Switch cwSwitch = new Switch(this);
        cwSwitch.setChecked(Prefs.continueWatching(this));
        cwSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Prefs.setContinueWatching(this, isChecked);
        });
        cw.addView(cwSwitch);
        rows.addView(cw);

        // --- Auto Update ---
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

    private void addSectionHeader(int titleRes, int summaryRes) {
        TextView header = new TextView(this);
        header.setText(titleRes);
        header.setTextSize(14);
        header.setTextColor(0xFF00D4FF);
        header.setPadding(dp(20), dp(20), dp(20), dp(8));
        rows.addView(header);

        TextView summary = new TextView(this);
        summary.setText(summaryRes);
        summary.setTextSize(12);
        summary.setTextColor(0xFF7E8798);
        summary.setPadding(dp(20), 0, dp(20), dp(12));
        rows.addView(summary);
    }

    private int dp(float v) { return Ui.dp(this, v); }

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

    private void editAppLockPin() {
        final EditText et = new EditText(this);
        et.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        et.setHint(getString(R.string.dialog_pin_hint));
        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_pin_title)
                .setView(et)
                .setPositiveButton(R.string.dialog_repo_save, (d, w) -> {
                    String pin = et.getText().toString().trim();
                    if (pin.length() >= 4 && pin.length() <= 8) {
                        Prefs.setAppLockPin(this, pin);
                        Toast.makeText(this, "PIN set", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "PIN must be 4-8 digits", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showFocusStyleDialog() {
        final String[] styles = {
            getString(R.string.focus_style_subtle),
            getString(R.string.focus_style_bold),
            getString(R.string.focus_style_minimal)
        };

        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_focus_style_title)
                .setSingleChoiceItems(styles, Prefs.focusStyle(this), (dialog, which) -> {
                    Prefs.setFocusStyle(this, which);
                    FocusManager fm = new FocusManager(this);
                    fm.applyFocusStyle(findViewById(android.R.id.content));
                    dialog.dismiss();
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showSleepTimerDialog() {
        final String[] options = {
            getString(R.string.sleep_timer_5),
            getString(R.string.sleep_timer_15),
            getString(R.string.sleep_timer_30),
            getString(R.string.sleep_timer_60),
            getString(R.string.sleep_timer_120),
            getString(R.string.sleep_timer_custom)
        };

        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_sleep_timer_title)
                .setSingleChoiceItems(options, Prefs.sleepTimerDuration(this) / 5, (dialog, which) -> {
                    int[] minutes = {5, 15, 30, 60, 120, -1};
                    if (which == 5) {
                        showCustomSleepTimerDialog();
                    } else {
                        Prefs.setSleepTimerDuration(this, minutes[which]);
                        SleepTimerManager stm = new SleepTimerManager(this);
                        stm.setDuration(minutes[which]);
                        if (Prefs.sleepTimerEnabled(this)) {
                            new SleepTimerManager(this).startTimer(minutes[which]);
                        }
                    }
                    dialog.dismiss();
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showCustomSleepTimerDialog() {
        final EditText et = new EditText(this);
        et.setInputType(InputType.TYPE_CLASS_NUMBER);
        et.setHint(R.string.dialog_sleep_timer_hint);
        et.setText(String.valueOf(Prefs.sleepTimerDuration(this)));
        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_sleep_timer_title)
                .setView(et)
                .setPositiveButton(R.string.dialog_repo_save, (d, w) -> {
                    try {
                        int minutes = Integer.parseInt(et.getText().toString().trim());
                        if (minutes >= 5 && minutes <= 480) {
                            Prefs.setSleepTimerDuration(this, minutes);
                            SleepTimerManager stm = new SleepTimerManager(this);
                            stm.setDuration(minutes);
                            if (Prefs.sleepTimerEnabled(this)) {
                                new SleepTimerManager(this).startTimer(minutes);
                            }
                        }
                    } catch (NumberFormatException e) {
                        Toast.makeText(this, "Invalid number", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showFirewallDialog() {
        final List<String> apps = new FirewallManager(this).getInstalledApps();
        final boolean[] checked = new boolean[apps.size()];
        Set<String> blocked = new FirewallManager(this).getBlockedApps();

        for (int i = 0; i < apps.size(); i++) {
            checked[i] = blocked.contains(apps.get(i));
        }

        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_firewall_title)
                .setMultiChoiceItems(apps.toArray(new String[0]), checked, (dialog, which, isChecked) -> {
                    String pkg = apps.get(which);
                    if (isChecked) {
                        new FirewallManager(this).addBlockedApp(apps.get(which));
                    } else {
                        new FirewallManager(this).removeBlockedApp(apps.get(which));
                    }
                })
                .setPositiveButton(R.string.dialog_repo_save, null)
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showCecDialog() {
        if (!new CecManager(this).isCecSupported()) {
            Toast.makeText(this, "HDMI-CEC not supported on this device", Toast.LENGTH_SHORT).show();
            return;
        }

        List<CecManager.CecDevice> devices = new CecManager(this).getDevices();
        if (devices.isEmpty()) {
            Toast.makeText(this, "No CEC devices found", Toast.LENGTH_SHORT).show();
            return;
        }

        String[] items = new String[devices.size()];
        for (int i = 0; i < devices.size(); i++) {
            CecManager.CecDevice d = devices.get(i);
            items[i] = d.deviceType + " (" + d.powerStatus + ") - " + d.vendorName + " " + d.productName;
        }

        new AlertDialog.Builder(this)
                .setTitle(R.string.dialog_cec_title)
                .setItems(items, (dialog, which) -> {
                    CecManager.CecDevice d = devices.get(which);
                    showCecDeviceOptions(d);
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showCecDeviceOptions(CecManager.CecDevice device) {
        String[] options = {
            "Power On",
            "Power Off",
            "Volume Up",
            "Volume Down",
            "Set as Active Source",
            "Device Info"
        };

        new AlertDialog.Builder(this)
                .setTitle(device.deviceType + " (" + device.powerStatus + ")")
                .setItems(options, (dialog, which) -> {
                    CecManager cm = new CecManager(this);
                    switch (which) {
                        case 0: cm.powerOnDevice(device.id); break;
                        case 1: cm.powerOffDevice(device.id); break;
                        case 2: cm.volumeUp(); break;
                        case 3: cm.volumeDown(); break;
                        case 4: cm.setActiveSource(device.id); break;
                        case 5: showDeviceInfo(device); break;
                    }
                })
                .setNegativeButton(R.string.dialog_repo_cancel, null)
                .show();
    }

    private void showDeviceInfo(CecManager.CecDevice device) {
        String info = "ID: " + device.id + "\n" +
                "Logical Address: " + device.logicalAddress + "\n" +
                "Type: " + device.deviceType + "\n" +
                "Vendor: " + device.vendorName + "\n" +
                "Product: " + device.productName + "\n" +
                "Physical Address: " + device.physicalAddress + "\n" +
                "Power: " + device.powerStatus + "\n" +
                "Active Source: " + (device.activeSource ? "Yes" : "No");
        new AlertDialog.Builder(this)
                .setTitle("Device Info")
                .setMessage(info)
                .setPositiveButton("OK", null)
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

    private int dp(float v) { return Ui.dp(this, v); }
}