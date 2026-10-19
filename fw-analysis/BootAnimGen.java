import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.imageio.ImageIO;

public class BootAnimGen {
    static final int W = 1280, H = 720;
    static final Color BG = new Color(0x0A0D12);
    static final Color ACCENT1 = new Color(0x4F7CFF);
    static final Color ACCENT2 = new Color(0x9B5CFF);
    static final Color WHITE = Color.WHITE;
    static final Color SUBTLE = new Color(0x3A4D6E);

    public static void main(String[] args) throws Exception {
        File outDir = new File("C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\ba_frames");
        outDir.mkdirs();
        
        // Part 0: Intro - 30 frames
        System.out.println("Generating part0 (intro)...");
        for (int f = 0; f < 30; f++) {
            float t = f / 29.0f;
            BufferedImage img = renderIntro(t);
            File f0 = new File(outDir, "part0");
            f0.mkdirs();
            ImageIO.write(img, "PNG", new File(f0, String.format("%04d.png", f)));
        }
        
        // Part 1: Loop - 60 frames
        System.out.println("Generating part1 (loop)...");
        for (int f = 0; f < 60; f++) {
            float t = f / 60.0f;
            BufferedImage img = renderLoop(t);
            File f1 = new File(outDir, "part1");
            f1.mkdirs();
            ImageIO.write(img, "PNG", new File(f1, String.format("%04d.png", f)));
        }
        
        // Write desc.txt
        File desc = new File(outDir, "desc.txt");
        try (java.io.PrintWriter pw = new java.io.PrintWriter(desc)) {
            pw.println(W + " " + H + " 30");
            pw.println("p 1 0 part0");
            pw.println("p 0 0 part1");
        }
        
        // Create ZIP (STORED compression)
        File zip = new File("C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\bootanimation.zip");
        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zip))) {
            zos.setLevel(0); // STORED
            addDirToZip(outDir, "", zos);
        }
        System.out.println("Created " + zip.getAbsolutePath() + " (" + zip.length() + " bytes)");
    }
    
    static void addDirToZip(File dir, String prefix, ZipOutputStream zos) throws Exception {
        for (File f : dir.listFiles()) {
            String name = prefix + f.getName();
            if (f.isDirectory()) {
                addDirToZip(f, name + "/", zos);
            } else {
                ZipEntry e = new ZipEntry(name);
                zos.putNextEntry(e);
                java.nio.file.Files.copy(f.toPath(), zos);
                zos.closeEntry();
            }
        }
    }
    
    static BufferedImage renderIntro(float t) {
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        
        // Background
        g.setColor(BG);
        g.fillRect(0, 0, W, H);
        
        // Subtle radial glow
        float glowIntensity = easeOutCubic(t) * 0.15f;
        RadialGradientPaint glow = new RadialGradientPaint(
            W/2f, H/2f, Math.max(W, H) * 0.7f,
            new float[]{0f, 1f},
            new Color[]{new Color(ACCENT1.getRed(), ACCENT1.getGreen(), ACCENT1.getBlue(), (int)(80 * glowIntensity)), 
                       new Color(0,0,0,0)});
        g.setPaint(glow);
        g.fillRect(0, 0, W, H);
        
        // "OBAA" text
        Font font = new Font("Segoe UI", Font.BOLD, 140);
        g.setFont(font);
        String text = "OBAA";
        FontMetrics fm = g.getFontMetrics();
        int textW = fm.stringWidth(text);
        int textH = fm.getHeight();
        int x = (W - textW) / 2;
        int y = (H - textH) / 2 + fm.getAscent();
        
        // Fade in + slide up
        float alpha = easeOutCubic(t);
        float slide = (1f - alpha) * 40f;
        
        // Gradient text
        LinearGradientPaint textGrad = new LinearGradientPaint(
            x, y - textH, x, y + 10,
            new float[]{0f, 0.5f, 1f},
            new Color[]{ACCENT1, new Color(0xFFFFFF), ACCENT2});
        g.setPaint(textGrad);
        g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, alpha));
        g.drawString(text, x, y - slide);
        
        // "powered by android" below
        if (t > 0.6f) {
            Font smallFont = new Font("Segoe UI", Font.PLAIN, 24);
            g.setFont(smallFont);
            String sub = "powered by android";
            FontMetrics sfm = g.getFontMetrics();
            int subW = sfm.stringWidth(sub);
            int subX = (W - subW) / 2;
            int subY = y + 60;
            float subAlpha = Math.min(1f, (t - 0.6f) / 0.4f);
            g.setColor(new Color(0x88, 0x99, 0xAA, (int)(200 * subAlpha)));
            g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, subAlpha));
            g.drawString(sub, subX, subY);
        }
        
        // Accent line under logo - sweeps in
        if (t > 0.3f) {
            float lineT = Math.min(1f, (t - 0.3f) / 0.5f);
            int lineW = (int)(textW * easeOutCubic(lineT));
            int lineX = x + (textW - lineW) / 2;
            int lineY = y + 10;
            GradientPaint lineGrad = new GradientPaint(lineX, lineY, ACCENT1, lineX + lineW, lineY, ACCENT2);
            g.setPaint(lineGrad);
            g.setStroke(new BasicStroke(3, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, alpha));
            g.drawLine(lineX, lineY, lineX + lineW, lineY);
        }
        
        g.dispose();
        return img;
    }
    
    static BufferedImage renderLoop(float t) {
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        
        // Background
        g.setColor(BG);
        g.fillRect(0, 0, W, H);
        
        // Breathing radial glow
        float breathe = 0.08f + 0.04f * (float)Math.sin(t * 2 * Math.PI);
        RadialGradientPaint glow = new RadialGradientPaint(
            W/2f, H/2f, Math.max(W, H) * 0.7f,
            new float[]{0f, 1f},
            new Color[]{new Color(ACCENT1.getRed(), ACCENT1.getGreen(), ACCENT1.getBlue(), (int)(80 * breathe)), 
                       new Color(0,0,0,0)});
        g.setPaint(glow);
        g.fillRect(0, 0, W, H);
        
        // "OBAA" text - constant
        Font font = new Font("Segoe UI", Font.BOLD, 140);
        g.setFont(font);
        String text = "OBAA";
        FontMetrics fm = g.getFontMetrics();
        int textW = fm.stringWidth(text);
        int textH = fm.getHeight();
        int x = (W - textW) / 2;
        int y = (H - textH) / 2 + fm.getAscent();
        
        // Static gradient text
        LinearGradientPaint textGrad = new LinearGradientPaint(
            x, y - textH, x, y + 10,
            new float[]{0f, 0.5f, 1f},
            new Color[]{ACCENT1, new Color(0xFFFFFF), ACCENT2});
        g.setPaint(textGrad);
        g.drawString(text, x, y);
        
        // Subtle "powered by android"
        Font smallFont = new Font("Segoe UI", Font.PLAIN, 24);
        g.setFont(smallFont);
        String sub = "powered by android";
        FontMetrics sfm = g.getFontMetrics();
        int subW = sfm.stringWidth(sub);
        int subX = (W - subW) / 2;
        int subY = y + 60;
        g.setColor(new Color(0x66, 0x77, 0x88));
        g.drawString(sub, subX, subY);
        
        // Shining sweep across logo (every 2 seconds)
        float sweepPhase = (t * 0.5f) % 1f; // 2 sec period at 30fps
        int sweepX = (int)(x - textW * 0.2f + sweepPhase * (textW * 1.4f));
        int sweepW = 100;
        if (sweepX > x - sweepW && sweepX < x + textW) {
            GradientPaint sweepGrad = new GradientPaint(
                sweepX, y - textH, new Color(255,255,255,0),
                sweepX + sweepW, y - textH, new Color(255,255,255,180));
            g.setPaint(sweepGrad);
            g.fillRect(sweepX, y - textH - 5, sweepW, textH + 10);
        }
        
        // Accent line - subtle pulse
        float lineAlpha = 0.4f + 0.2f * (float)Math.sin(t * 2 * Math.PI);
        GradientPaint lineGrad = new GradientPaint(x, y + 10, ACCENT1, x + textW, y + 10, ACCENT2);
        g.setPaint(lineGrad);
        g.setStroke(new BasicStroke(3, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, lineAlpha));
        g.drawLine(x, y + 10, x + textW, y + 10);
        
        g.dispose();
        return img;
    }
    
    static float easeOutCubic(float t) { return 1f - (float)Math.pow(1f - t, 3); }
}