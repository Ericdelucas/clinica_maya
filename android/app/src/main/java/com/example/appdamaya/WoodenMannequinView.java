package com.example.appdamaya;

import android.content.Context;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.ViewConfiguration;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Actual lit 3D geometry with a depth buffer; gestures rotate the entire model. */
public class WoodenMannequinView extends GLSurfaceView {
    public interface Listener { void onHotspotSelected(ClinicalHotspot hotspot); }
    private final Scene scene = new Scene();
    private Listener listener;
    private float lastX, drag;
    private final int touchSlop;

    public WoodenMannequinView(Context context) { this(context, null); }
    public WoodenMannequinView(Context context, AttributeSet attrs) {
        super(context, attrs);
        touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        setEGLContextClientVersion(2);
        setEGLConfigChooser(8, 8, 8, 8, 16, 0);
        setPreserveEGLContextOnPause(true);
        setRenderer(scene);
        setRenderMode(RENDERMODE_WHEN_DIRTY);
        setContentDescription("Manequim clínico 3D. Arraste para girar e toque nos pontos de dor.");
    }
    public void setListener(Listener value) { listener = value; }
    public void setSelectedId(String value) {
        queueEvent(() -> scene.selected = value == null ? "" : value);
        requestRender();
    }
    @Override public boolean onTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            lastX = event.getX(); drag = 0;
            getParent().requestDisallowInterceptTouchEvent(true);
            return true;
        }
        if (event.getActionMasked() == MotionEvent.ACTION_MOVE) {
            float dx = event.getX() - lastX; lastX = event.getX(); drag += Math.abs(dx);
            if (drag > touchSlop) {
                queueEvent(() -> scene.yaw += dx * 180f / Math.max(1, getWidth()));
                requestRender();
            }
            return true;
        }
        if (event.getActionMasked() == MotionEvent.ACTION_UP) {
            getParent().requestDisallowInterceptTouchEvent(false);
            if (drag <= touchSlop) {
                float x = event.getX(), y = event.getY();
                float radius = 28 * getResources().getDisplayMetrics().density;
                queueEvent(() -> {
                    ClinicalHotspot hit = scene.pick(x, y, radius);
                    if (hit != null) {
                        scene.selected = hit.id;
                        post(() -> { performClick(); if (listener != null) listener.onHotspotSelected(hit); });
                        requestRender();
                    }
                });
            }
            return true;
        }
        if (event.getActionMasked() == MotionEvent.ACTION_CANCEL) {
            getParent().requestDisallowInterceptTouchEvent(false); return true;
        }
        return super.onTouchEvent(event);
    }
    @Override public boolean performClick() { return super.performClick(); }

    private static class Shape {
        final float x, y, z, sx, sy, sz, angle;
        Shape(float x, float y, float z, float sx, float sy, float sz, float angle) {
            this.x=x; this.y=y; this.z=z; this.sx=sx; this.sy=sy; this.sz=sz; this.angle=angle;
        }
    }
    private static class Scene implements Renderer {
        private final float[] projection=new float[16], view=new float[16], rotation=new float[16];
        private final float[] model=new float[16], mv=new float[16], mvp=new float[16], vp=new float[16];
        private final List<Shape> body=new ArrayList<>();
        private FloatBuffer sphere;
        private int count, program, position, normal, matrix, modelView, normalUniform, color;
        private int width, height;
        private float yaw=-12;
        private String selected="";
        Scene() {
            // Clinical mannequin: oval head, neck, rib cage, pelvis and connected limbs.
            add(0,1.77f,0,.145f,.205f,.145f);
            add(0,1.53f,0,.065f,.095f,.065f);
            add(0,1.22f,0,.285f,.29f,.15f);
            add(0,.88f,0,.18f,.20f,.115f);
            add(0,.57f,0,.245f,.17f,.15f);
            add(0,1.76f,.143f,.038f,.055f,.035f); // Nose establishes front direction.
            for (int side : new int[]{-1,1}) {
                limb(side*.34f,1.39f,side*.58f,1.02f,.064f);
                limb(side*.58f,1.02f,side*.66f,.62f,.047f);
                limb(side*.18f,.48f,side*.23f,-.08f,.087f);
                limb(side*.23f,-.08f,side*.24f,-.72f,.061f);
                add(side*.69f,.54f,.01f,.045f,.087f,.037f);
                add(side*.24f,-.78f,.075f,.067f,.05f,.14f);
                add(side*.34f,1.39f,0,.073f,.073f,.073f);
                add(side*.58f,1.02f,0,.055f,.055f,.055f);
                add(side*.23f,-.08f,0,.065f,.065f,.065f);
            }
        }
        private void add(float x,float y,float z,float sx,float sy,float sz) { body.add(new Shape(x,y,z,sx,sy,sz,0)); }
        private void limb(float x1,float y1,float x2,float y2,float radius) {
            float length=(float)Math.hypot(x2-x1,y2-y1);
            float angle=(float)Math.toDegrees(Math.atan2(-(x2-x1),y2-y1));
            body.add(new Shape((x1+x2)/2,(y1+y2)/2,0,radius,length/2+radius*.4f,radius,angle));
        }
        @Override public void onSurfaceCreated(GL10 gl, EGLConfig config) {
            GLES20.glClearColor(.93f,.96f,.97f,1);
            GLES20.glEnable(GLES20.GL_DEPTH_TEST);
            String vertex="attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMvp; uniform mat4 uMv; uniform mat4 uNormal; varying vec3 vNormal; varying vec3 vPosition; void main(){ gl_Position=uMvp*vec4(aPosition,1.0); vPosition=(uMv*vec4(aPosition,1.0)).xyz; vNormal=mat3(uNormal)*aNormal; }";
            String fragment="precision mediump float; uniform vec3 uColor; varying vec3 vNormal; varying vec3 vPosition; void main(){ vec3 n=normalize(vNormal); vec3 l=normalize(vec3(-2.0,4.0,5.0)-vPosition); float d=max(dot(n,l),0.0); vec3 h=normalize(l+normalize(-vPosition)); float s=pow(max(dot(n,h),0.0),32.0); gl_FragColor=vec4(uColor*(0.38+0.62*d)+vec3(0.18*s),1.0); }";
            program=GLES20.glCreateProgram();
            GLES20.glAttachShader(program,shader(GLES20.GL_VERTEX_SHADER,vertex));
            GLES20.glAttachShader(program,shader(GLES20.GL_FRAGMENT_SHADER,fragment));
            GLES20.glLinkProgram(program);
            int[] ok=new int[1]; GLES20.glGetProgramiv(program,GLES20.GL_LINK_STATUS,ok,0);
            if(ok[0]==0) throw new IllegalStateException(GLES20.glGetProgramInfoLog(program));
            position=GLES20.glGetAttribLocation(program,"aPosition"); normal=GLES20.glGetAttribLocation(program,"aNormal");
            matrix=GLES20.glGetUniformLocation(program,"uMvp"); modelView=GLES20.glGetUniformLocation(program,"uMv"); color=GLES20.glGetUniformLocation(program,"uColor"); normalUniform=GLES20.glGetUniformLocation(program,"uNormal");
            List<Float> vertices=new ArrayList<>();
            int rows=24, cols=36;
            for(int r=0;r<rows;r++) for(int c=0;c<cols;c++) {
                point(vertices,r,c,rows,cols); point(vertices,r+1,c,rows,cols); point(vertices,r,c+1,rows,cols);
                point(vertices,r,c+1,rows,cols); point(vertices,r+1,c,rows,cols); point(vertices,r+1,c+1,rows,cols);
            }
            count=vertices.size()/3;
            sphere=ByteBuffer.allocateDirect(vertices.size()*4).order(ByteOrder.nativeOrder()).asFloatBuffer();
            for(float v:vertices) sphere.put(v); sphere.position(0);
        }
        private static void point(List<Float> out,int r,int c,int rows,int cols) {
            double a=Math.PI*r/rows, b=2*Math.PI*c/cols;
            out.add((float)(Math.sin(a)*Math.cos(b))); out.add((float)Math.cos(a)); out.add((float)(Math.sin(a)*Math.sin(b)));
        }
        private static int shader(int type,String source) {
            int result=GLES20.glCreateShader(type); GLES20.glShaderSource(result,source); GLES20.glCompileShader(result);
            int[] ok=new int[1]; GLES20.glGetShaderiv(result,GLES20.GL_COMPILE_STATUS,ok,0);
            if(ok[0]==0) throw new IllegalStateException(GLES20.glGetShaderInfoLog(result));
            return result;
        }
        @Override public void onSurfaceChanged(GL10 gl,int w,int h) {
            width=w; height=h; GLES20.glViewport(0,0,w,h);
            float aspect=(float)w/Math.max(h,1);
            // Fit full body from feet (-.83) to crown (1.98), including narrow screens.
            float halfY=Math.max(1.65f, .94f/aspect);
            Matrix.orthoM(projection,0,-halfY*aspect,halfY*aspect,-halfY,halfY,1,12);
            Matrix.setLookAtM(view,0,0,.57f,5,0,.57f,0,0,1,0);
        }
        private void transforms() {
            Matrix.setRotateM(rotation,0,yaw,0,1,0);
            Matrix.multiplyMM(vp,0,projection,0,view,0);
            Matrix.multiplyMM(mvp,0,vp,0,rotation,0);
        }
        @Override public void onDrawFrame(GL10 gl) {
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);
            transforms(); GLES20.glUseProgram(program);
            sphere.position(0); GLES20.glVertexAttribPointer(position,3,GLES20.GL_FLOAT,false,0,sphere);
            GLES20.glVertexAttribPointer(normal,3,GLES20.GL_FLOAT,false,0,sphere);
            GLES20.glEnableVertexAttribArray(position); GLES20.glEnableVertexAttribArray(normal);
            for(Shape shape:body) draw(shape,.77f,.63f,.46f);
            for(ClinicalHotspot h:ClinicalHotspot.ALL) {
                float z=markerZ(h), radius=h.id.equals(selected)?.065f:.047f;
                draw(new Shape(h.x,h.y,z,radius,radius,radius,0),.91f,h.id.equals(selected)?.25f:.06f,.08f);
            }
        }
        private static float markerZ(ClinicalHotspot h) {
            if(h.z<0) return h.z-.055f;
            if(h.z>0) return h.z+.05f;
            return .085f;
        }
        private void draw(Shape shape,float r,float g,float b) {
            System.arraycopy(rotation,0,model,0,16);
            Matrix.translateM(model,0,shape.x,shape.y,shape.z);
            Matrix.rotateM(model,0,shape.angle,0,0,1);
            Matrix.scaleM(model,0,shape.sx,shape.sy,shape.sz);
            Matrix.multiplyMM(mv,0,view,0,model,0); Matrix.multiplyMM(mvp,0,projection,0,mv,0);
            GLES20.glUniformMatrix4fv(matrix,1,false,mvp,0);
            // Inverse transpose gives correct lighting for stretched ellipsoids.
            float[] normalMatrix=new float[16], inverse=new float[16];
            Matrix.invertM(inverse,0,mv,0); Matrix.transposeM(normalMatrix,0,inverse,0);
            GLES20.glUniformMatrix4fv(normalUniform,1,false,normalMatrix,0);
            GLES20.glUniformMatrix4fv(modelView,1,false,mv,0);
            GLES20.glUniform3f(color,r,g,b); GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,count);
        }
        ClinicalHotspot pick(float x,float y,float radius) {
            transforms(); float[] transform=mvp.clone();
            ClinicalHotspot best=null; float distance=radius*radius;
            for(ClinicalHotspot h:ClinicalHotspot.ALL) {
                float z=markerZ(h);
                double radians=Math.toRadians(yaw);
                // Reject points on the far side of the body.
                if(-h.x*Math.sin(radians)+z*Math.cos(radians)<-.025f) continue;
                float[] p=new float[4]; Matrix.multiplyMV(p,0,transform,0,new float[]{h.x,h.y,z,1},0);
                float px=(p[0]/p[3]+1)*width/2, py=(1-p[1]/p[3])*height/2;
                float d=(x-px)*(x-px)+(y-py)*(y-py);
                if(d<distance) { distance=d; best=h; }
            }
            return best;
        }
    }
}
