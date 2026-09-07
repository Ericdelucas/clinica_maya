package com.example.appdamaya;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;

import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Manequim clínico girável — mesmas âncoras do WoodenMannequin do site.
 * Arraste na horizontal para girar; toque na bolinha vermelha para selecionar.
 */
public class WoodenMannequinView extends View {
    public interface Listener {
        void onHotspotSelected(ClinicalHotspot hotspot);
    }

    private static final int SKIN = 0xFFD7A16B;
    private static final int SKIN_LIGHT = 0xFFE2B886;
    private static final int SKIN_SHADOW = 0xFFA96A35;
    private static final int WOOD = 0xFFBD7F3F;
    private static final int JOINT_WOOD = 0xFFD0A069;
    private static final int DARK_WOOD = 0xFF8F592C;
    private static final int WAIST = 0xFFC68B55;
    private static final int THIGH = 0xFFC98850;
    private static final int HOTSPOT = 0xFFE53935;
    private static final int HOTSPOT_ON = 0xFFFF6B6B;
    private static final int TAG = 0xFF4F9AAB;

    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF oval = new RectF();
    private final List<Part> parts = new ArrayList<>();

    private Listener listener;
    private String selectedId = "";
    private float yaw;
    private float lastX;
    private float totalDrag;
    private boolean dragging;
    private final int touchSlop;

    public WoodenMannequinView(Context context) {
        this(context, null);
    }

    public WoodenMannequinView(Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public WoodenMannequinView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        textPaint.setColor(Color.WHITE);
        textPaint.setTypeface(Typeface.DEFAULT_BOLD);
        textPaint.setTextAlign(Paint.Align.CENTER);
        setClickable(true);
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    public void setSelectedId(String id) {
        selectedId = id == null ? "" : id;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float cx = getWidth() / 2f;
        float cy = getHeight() * 0.48f;
        float scale = Math.min(getWidth() / 2.15f, getHeight() / 3.55f);

        parts.clear();
        addBody(parts);
        addHotspots(parts);
        Collections.sort(parts, Comparator.comparingDouble(part -> part.z));

        for (Part part : parts) {
            drawPart(canvas, part, cx, cy, scale);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lastX = event.getX();
                totalDrag = 0f;
                dragging = false;
                getParent().requestDisallowInterceptTouchEvent(true);
                return true;
            case MotionEvent.ACTION_MOVE: {
                float dx = event.getX() - lastX;
                totalDrag += Math.abs(dx);
                if (totalDrag > touchSlop) {
                    dragging = true;
                    yaw += dx / getWidth() * 3.2f;
                    invalidate();
                }
                lastX = event.getX();
                return true;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                getParent().requestDisallowInterceptTouchEvent(false);
                if (!dragging) {
                    ClinicalHotspot hit = hitTest(event.getX(), event.getY());
                    if (hit != null) {
                        selectedId = hit.id;
                        invalidate();
                        if (listener != null) {
                            listener.onHotspotSelected(hit);
                        }
                        performClick();
                    }
                }
                dragging = false;
                return true;
            default:
                return super.onTouchEvent(event);
        }
    }

    @Override
    public boolean performClick() {
        return super.performClick();
    }

    private ClinicalHotspot hitTest(float px, float py) {
        float cx = getWidth() / 2f;
        float cy = getHeight() * 0.48f;
        float scale = Math.min(getWidth() / 2.15f, getHeight() / 3.55f);
        float max = dp(28) * dp(28);
        ClinicalHotspot best = null;
        float bestDist = max;
        for (ClinicalHotspot hotspot : ClinicalHotspot.ALL) {
            float[] p = project(hotspot.x, hotspot.y, hotspot.z, cx, cy, scale);
            if (p[2] < -0.02f) {
                continue;
            }
            float dx = px - p[0];
            float dy = py - p[1];
            float dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                best = hotspot;
            }
        }
        return best;
    }

    private void addBody(List<Part> list) {
        list.add(limb(-0.34f, 1.39f, 0f, -0.58f, 1.02f, 0f, 0.07f, 0.052f, SKIN));
        list.add(limb(0.34f, 1.39f, 0f, 0.58f, 1.02f, 0f, 0.07f, 0.052f, SKIN));
        list.add(limb(-0.58f, 1.02f, 0f, -0.66f, 0.62f, 0f, 0.048f, 0.038f, SKIN_LIGHT));
        list.add(limb(0.58f, 1.02f, 0f, 0.66f, 0.62f, 0f, 0.048f, 0.038f, SKIN_LIGHT));
        list.add(limb(-0.18f, 0.48f, 0f, -0.23f, -0.08f, 0f, 0.085f, 0.065f, THIGH));
        list.add(limb(0.18f, 0.48f, 0f, 0.23f, -0.08f, 0f, 0.085f, 0.065f, THIGH));
        list.add(limb(-0.23f, -0.08f, 0f, -0.24f, -0.72f, 0f, 0.06f, 0.043f, SKIN_LIGHT));
        list.add(limb(0.23f, -0.08f, 0f, 0.24f, -0.72f, 0f, 0.06f, 0.043f, SKIN_LIGHT));

        list.add(body(0f, 1.17f, 0f, 0.56f, 0.28f, 0.17f, 0.58f, SKIN));
        list.add(body(0f, 0.79f, 0.015f, 0.28f, 0.15f, 0.13f, 0.48f, WAIST));
        list.add(body(0f, 0.52f, 0f, 0.20f, 0.18f, 0.24f, 0.55f, SKIN_SHADOW));

        list.add(ellipsoid(0f, 1.78f, 0.035f, 0.145f, 0.195f, 0.13f, SKIN_LIGHT));
        list.add(ellipsoid(0f, 1.78f, 0.16f, 0.055f, 0.075f, 0.032f, DARK_WOOD));
        list.add(ellipsoid(-0.69f, 0.55f, 0.04f, 0.045f, 0.075f, 0.035f, SKIN_LIGHT));
        list.add(ellipsoid(0.69f, 0.55f, 0.04f, 0.045f, 0.075f, 0.035f, SKIN_LIGHT));
        list.add(ellipsoid(-0.25f, -0.78f, 0.10f, 0.065f, 0.035f, 0.14f, SKIN_LIGHT));
        list.add(ellipsoid(0.25f, -0.78f, 0.10f, 0.065f, 0.035f, 0.14f, SKIN_LIGHT));

        list.add(sphere(0f, 1.55f, 0f, 0.055f, JOINT_WOOD, false, null));
        list.add(sphere(-0.34f, 1.39f, 0f, 0.075f, JOINT_WOOD, false, null));
        list.add(sphere(0.34f, 1.39f, 0f, 0.075f, JOINT_WOOD, false, null));
        list.add(sphere(-0.58f, 1.02f, 0f, 0.055f, JOINT_WOOD, false, null));
        list.add(sphere(0.58f, 1.02f, 0f, 0.055f, JOINT_WOOD, false, null));
        list.add(sphere(-0.66f, 0.62f, 0f, 0.044f, JOINT_WOOD, false, null));
        list.add(sphere(0.66f, 0.62f, 0f, 0.044f, JOINT_WOOD, false, null));
        list.add(sphere(-0.18f, 0.48f, 0f, 0.065f, JOINT_WOOD, false, null));
        list.add(sphere(0.18f, 0.48f, 0f, 0.065f, JOINT_WOOD, false, null));
        list.add(sphere(-0.23f, -0.08f, 0f, 0.06f, JOINT_WOOD, false, null));
        list.add(sphere(0.23f, -0.08f, 0f, 0.06f, JOINT_WOOD, false, null));
        list.add(sphere(-0.24f, -0.72f, 0f, 0.048f, JOINT_WOOD, false, null));
        list.add(sphere(0.24f, -0.72f, 0f, 0.048f, JOINT_WOOD, false, null));

        list.add(tag(-0.52f, 1.52f, 0f, "D"));
        list.add(tag(0.52f, 1.52f, 0f, "E"));
    }

    private void addHotspots(List<Part> list) {
        for (ClinicalHotspot hotspot : ClinicalHotspot.ALL) {
            boolean selected = hotspot.id.equals(selectedId);
            float radius = hotspot.region.equals("Coluna") || hotspot.id.equals("epigastrio") ? 0.07f : 0.078f;
            list.add(sphere(
                    hotspot.x,
                    hotspot.y,
                    hotspot.z,
                    radius,
                    selected ? HOTSPOT_ON : HOTSPOT,
                    true,
                    hotspot.id
            ));
        }
    }

    private void drawPart(Canvas canvas, Part part, float cx, float cy, float scale) {
        if (part.kind == Part.LIMB) {
            float[] a = project(part.x, part.y, part.z, cx, cy, scale);
            float[] b = project(part.x2, part.y2, part.z2, cx, cy, scale);
            drawCapsule(canvas, a[0], a[1], b[0], b[1], part.r1 * scale, part.r2 * scale, shade(part.color, (a[2] + b[2]) / 2f));
            return;
        }
        float[] p = project(part.x, part.y, part.z, cx, cy, scale);
        if (part.kind == Part.TAG) {
            if (p[2] < -0.05f) {
                return;
            }
            float r = dp(16);
            fill.setShader(null);
            fill.setColor(TAG);
            canvas.drawCircle(p[0], p[1], r, fill);
            textPaint.setTextSize(dp(13));
            canvas.drawText(part.label, p[0], p[1] + dp(4.5f), textPaint);
            return;
        }
        if (part.kind == Part.BODY) {
            float w = (part.r1 + part.r2) * 0.92f * scale;
            float h = part.height * scale;
            oval.set(p[0] - w, p[1] - h / 2f, p[0] + w, p[1] + h / 2f);
            fill.setShader(new LinearGradient(
                    p[0] - w * 0.3f, p[1] - h / 2f, p[0] + w, p[1] + h / 2f,
                    lighter(part.color), shade(part.color, p[2]), Shader.TileMode.CLAMP
            ));
            canvas.drawRoundRect(oval, w, w, fill);
            fill.setShader(null);
            return;
        }
        if (part.kind == Part.ELLIPSOID) {
            float rx = part.r1 * scale;
            float ry = part.height * scale;
            if (part.label != null && "face".equals(part.label) && p[2] < 0.04f) {
                return;
            }
            oval.set(p[0] - rx, p[1] - ry, p[0] + rx, p[1] + ry);
            fill.setShader(new RadialGradient(
                    p[0] - rx * 0.25f, p[1] - ry * 0.28f, Math.max(rx, ry) * 1.35f,
                    lighter(part.color), shade(part.color, p[2]), Shader.TileMode.CLAMP
            ));
            canvas.drawOval(oval, fill);
            fill.setShader(null);
            return;
        }
        float r = part.r1 * scale;
        fill.setShader(new RadialGradient(
                p[0] - r * 0.28f, p[1] - r * 0.32f, r * 1.25f,
                lighter(part.color), part.color, Shader.TileMode.CLAMP
        ));
        canvas.drawCircle(p[0], p[1], r, fill);
        fill.setShader(null);
    }

    private void drawCapsule(Canvas canvas, float x1, float y1, float x2, float y2, float r1, float r2, int color) {
        float dx = x2 - x1;
        float dy = y2 - y1;
        float len = (float) Math.hypot(dx, dy);
        if (len < 1f) {
            return;
        }
        float angle = (float) Math.toDegrees(Math.atan2(dy, dx));
        float r = (r1 + r2) / 2f;
        canvas.save();
        canvas.translate((x1 + x2) / 2f, (y1 + y2) / 2f);
        canvas.rotate(angle);
        oval.set(-len / 2f, -r, len / 2f, r);
        fill.setShader(new LinearGradient(
                -len / 2f, -r, len / 2f, r, lighter(color), color, Shader.TileMode.CLAMP
        ));
        canvas.drawRoundRect(oval, r, r, fill);
        fill.setShader(null);
        canvas.restore();
    }

    private float[] project(float x, float y, float z, float cx, float cy, float scale) {
        double c = Math.cos(yaw);
        double s = Math.sin(yaw);
        float xr = (float) (x * c - z * s);
        float zr = (float) (x * s + z * c);
        y += 0.12f;
        xr *= 1.08f;
        y *= 1.08f;
        zr *= 1.08f;
        return new float[]{cx + xr * scale, cy - y * scale, zr};
    }

    private Part limb(float x1, float y1, float z1, float x2, float y2, float z2, float r1, float r2, int color) {
        Part part = new Part();
        part.kind = Part.LIMB;
        part.x = x1;
        part.y = y1;
        part.z = (z1 + z2) / 2f;
        part.x2 = x2;
        part.y2 = y2;
        part.z2 = z2;
        part.r1 = r1;
        part.r2 = r2;
        part.color = color;
        return part;
    }

    private Part body(float x, float y, float z, float height, float top, float bottom, float depth, int color) {
        Part part = new Part();
        part.kind = Part.BODY;
        part.x = x;
        part.y = y;
        part.z = z;
        part.height = height;
        part.r1 = top;
        part.r2 = bottom;
        part.color = color;
        return part;
    }

    private Part ellipsoid(float x, float y, float z, float sx, float sy, float sz, int color) {
        Part part = new Part();
        part.kind = Part.ELLIPSOID;
        part.x = x;
        part.y = y;
        part.z = z;
        part.r1 = sx;
        part.height = sy;
        part.r2 = sz;
        part.color = color;
        if (z > 0.12f) {
            part.label = "face";
        }
        return part;
    }

    private Part sphere(float x, float y, float z, float r, int color, boolean hotspot, String id) {
        Part part = new Part();
        part.kind = Part.SPHERE;
        part.x = x;
        part.y = y;
        part.z = z + (hotspot ? 0.02f : 0f);
        part.r1 = r;
        part.color = color;
        part.label = id;
        return part;
    }

    private Part tag(float x, float y, float z, String label) {
        Part part = new Part();
        part.kind = Part.TAG;
        part.x = x;
        part.y = y;
        part.z = z + 0.03f;
        part.label = label;
        part.color = TAG;
        return part;
    }

    private int shade(int color, float z) {
        float t = Math.max(0f, Math.min(1f, (z + 0.25f) / 0.5f));
        return Color.rgb(
                (int) (Color.red(color) * (0.72f + 0.28f * t)),
                (int) (Color.green(color) * (0.72f + 0.28f * t)),
                (int) (Color.blue(color) * (0.72f + 0.28f * t))
        );
    }

    private int lighter(int color) {
        return Color.rgb(
                Math.min(255, Color.red(color) + 38),
                Math.min(255, Color.green(color) + 28),
                Math.min(255, Color.blue(color) + 18)
        );
    }

    private float dp(float value) {
        return value * getResources().getDisplayMetrics().density;
    }

    private static final class Part {
        static final int LIMB = 1;
        static final int BODY = 2;
        static final int ELLIPSOID = 3;
        static final int SPHERE = 4;
        static final int TAG = 5;
        int kind;
        float x;
        float y;
        float z;
        float x2;
        float y2;
        float z2;
        float r1;
        float r2;
        float height;
        int color;
        String label;
    }
}
