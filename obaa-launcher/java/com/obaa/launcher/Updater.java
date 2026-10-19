package com.obaa.launcher;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public final class Updater {
    public static final String UA = "OBAA-Launcher";
    private static final String ACTION_INSTALL_DONE = "com.obaa.launcher.INSTALL_DONE";

    private Updater() { }

    public static class Release {
        public String version = "";
        public String tag = "";
        public String notes = "";
        public String apkUrl = null;
        public long apkSize = 0;
        public boolean prerelease = false;
    }

    public static Release fetch(Context ctx) throws Exception {
        String repo = Prefs.repo(ctx);
        URL url = new URL("https://api.github.com/repos/" + repo + "/releases?per_page=15");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(20000);
        conn.setRequestProperty("User-Agent", UA);
        conn.setRequestProperty("Accept", "application/vnd.github+json");
        int code = conn.getResponseCode();
        if (code != 200) throw new Exception("GitHub HTTP " + code);
        InputStream in = conn.getInputStream();
        BufferedReader br = new BufferedReader(new InputStreamReader(in, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line).append('\n');
        br.close();
        JSONArray arr = new JSONArray(sb.toString());
        boolean beta = Prefs.beta(ctx);
        for (int i = 0; i < arr.length(); i++) {
            JSONObject r = arr.getJSONObject(i);
            if (r.optBoolean("draft")) continue;
            boolean pre = r.optBoolean("prerelease");
            if (pre && !beta) continue;
            Release rel = new Release();
            rel.tag = r.optString("tag_name", "");
            rel.version = rel.tag.startsWith("v") ? rel.tag.substring(1) : rel.tag;
            rel.notes = r.optString("body", "");
            rel.prerelease = pre;
            JSONArray assets = r.optJSONArray("assets");
            if (assets != null) {
                for (int a = 0; a < assets.length(); a++) {
                    JSONObject as = assets.getJSONObject(a);
                    String name = as.optString("name", "");
                    if (name.toLowerCase().endsWith(".apk")) {
                        rel.apkUrl = as.optString("browser_download_url", "");
                        rel.apkSize = as.optLong("size", 0);
                        break;
                    }
                }
            }
            return rel;
        }
        return null;
    }

    public static int compare(String a, String b) {
        String[] pa = a == null ? new String[0] : a.split("\\.");
        String[] pb = b == null ? new String[0] : b.split("\\.");
        int n = Math.max(pa.length, pb.length);
        for (int i = 0; i < n; i++) {
            int x = i < pa.length ? parseInt(pa[i]) : 0;
            int y = i < pb.length ? parseInt(pb[i]) : 0;
            if (x != y) return x - y;
        }
        return 0;
    }

    private static int parseInt(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    public static File download(Context ctx, Release rel) throws Exception {
        if (rel.apkUrl == null || rel.apkUrl.length() == 0) throw new Exception("no APK asset in release");
        File out = new File(ctx.getCacheDir(), "update.apk");
        HttpURLConnection conn = (HttpURLConnection) new URL(rel.apkUrl).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", UA);
        conn.setInstanceFollowRedirects(true);
        int code = conn.getResponseCode();
        if (code != 200) throw new Exception("download HTTP " + code);
        InputStream in = conn.getInputStream();
        FileOutputStream fos = new FileOutputStream(out);
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) > 0) fos.write(buf, 0, n);
        fos.close();
        in.close();
        return out;
    }

    public static void install(Context ctx, File apk) throws Exception {
        PackageInstaller pi = ctx.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams sp = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        int id = pi.createSession(sp);
        PackageInstaller.Session s = pi.openSession(id);
        OutputStream os = s.openWrite("base.apk", 0, apk.length());
        InputStream is = new FileInputStream(apk);
        byte[] buf = new byte[65536];
        int n;
        while ((n = is.read(buf)) > 0) os.write(buf, 0, n);
        s.fsync(os);
        os.close();
        is.close();
        Intent done = new Intent(ACTION_INSTALL_DONE).setPackage(ctx.getPackageName());
        PendingIntent pe = PendingIntent.getBroadcast(ctx, id, done, PendingIntent.FLAG_UPDATE_CURRENT);
        s.commit(pe.getIntentSender());
        s.close();
    }

    public static String currentVersion(Context ctx) {
        try {
            return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "1.1";
        }
    }
}
