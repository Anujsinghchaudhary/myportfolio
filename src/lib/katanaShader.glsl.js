/**
 * GLSL ES 3.00 shaders for the preloader's katana screen-penetration effect.
 *
 * One full-screen pass renders the whole loading screen:
 *   1. "Screen content": the backdrop gradient, ember particles, vignette and the
 *      title (from a text texture), written as a function of position so it can be
 *      sampled at displaced coordinates.
 *   2. The screen plane (z = 0) as a pane of glass that cracks around the impact
 *      point. Cracks are a log-polar Voronoi height field (radial + concentric
 *      fractures). Its analytic gradient is blended with per-shard tilt normals
 *      to drive refraction (screen-space displacement) and specular glints.
 *   3. A katana blade, ray-marched as a signed distance field and lit with a
 *      metallic GGX BRDF plus split-sum environment lighting. The blade tip moves
 *      linearly with loading progress from behind the plane out toward the camera.
 *
 * Depth sorting: the camera sits at z = CAM_Z looking down -z, with focal length
 * equal to CAM_Z, so the plane z = 0 maps 1:1 onto aspect-corrected screen
 * coordinates. A blade hit closer than the plane is drawn over the glass; a hit
 * behind the plane is visible only through the hole the blade punched.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;          // drawing-buffer size in px
uniform float uTime;        // seconds
uniform float uProgress;    // displayed load progress, 0..1
uniform float uImpactAge;   // seconds since the tip broke through, < 0 before
uniform float uTextAlpha;   // title fade-in
uniform sampler2D uText;    // premultiplied title texture, same size as the buffer

out vec4 outColor;

#define PI 3.14159265359
const float CAM_Z = 1.6;
// Impact sits lower-right and the blade travels up-left, so it ends below the title
// instead of covering it. With perspective the tip lands near (0.08, -0.18).
const vec3  IMPACT = vec3(0.45, -0.27, 0.0);
const vec3  BLADE_DIR = vec3(-0.48, 0.20, 0.8544);      // unit; tip travels up-left toward the viewer
const float BLADE_ROLL = 0.55;                          // rotation about the blade axis (rad)
const float S_MIN = -0.10;  // tip distance past the plane at progress 0 (behind the screen)
const float S_MAX = 0.85;   // ... at progress 1
const float HW = 0.028;     // blade half-width
const float HT = 0.0065;    // blade half-thickness at the spine
const float KISSAKI = 0.09; // length of the curved tip section
const float BLADE_LEN = 2.4;
const float SORI = 0.035;   // blade curvature
const float RAD_SCALE = 1.25;  // log-polar crack cells: low = long radial shards, few rings
const float ANG_CELLS = 15.0;  // ... cells around the impact (must be an integer)

// ---------------------------------------------------------------- hashing
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// ---------------------------------------------------------------- tone / color
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
// Rolls off highlights only, so the dark backdrop keeps its exact CSS colors.
vec3 rolloff(vec3 c) {
    vec3 k = max(c - 0.6, 0.0);
    return min(c, 0.6) + 0.4 * (1.0 - exp(-k / 0.4));
}

// ---------------------------------------------------------------- screen content
vec3 gradientStops(float t) {
    vec3 c0 = vec3(0.020, 0.020, 0.031); // #050508
    vec3 c1 = vec3(0.102, 0.039, 0.063); // #1a0a10
    vec3 c2 = vec3(0.071, 0.031, 0.059); // #12080f
    vec3 c3 = vec3(0.035, 0.035, 0.059); // #09090f
    if (t < 0.38) return mix(c0, c1, t / 0.38);
    if (t < 0.62) return mix(c1, c2, (t - 0.38) / 0.24);
    return mix(c2, c3, (t - 0.62) / 0.38);
}

float emberLayer(vec2 p, float scale, float speed, float seed, out float halo) {
    vec2 q = p * scale + vec2(sin(uTime * 0.3 + seed) * 0.3, -uTime * speed);
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float rnd = hash12(cell + seed);
    vec2 o = (hash22(cell + seed * 1.7) - 0.5) * 0.6;
    o.x += sin(uTime * 1.3 + rnd * 6.28) * 0.08;
    float d = length(f - o);
    float on = step(0.72, rnd);
    float flick = 0.7 + 0.3 * sin(uTime * 5.0 + rnd * 40.0);
    float size = mix(0.04, 0.11, hash12(cell + 7.0));
    halo = on * flick * exp(-d * d * 40.0) * 0.25;
    return on * flick * (1.0 - smoothstep(size * 0.2, size, d));
}

// sRGB composite of the original loading screen at uv (0..1, y up) / p (aspect space).
vec3 screenContent(vec2 uv, vec2 p) {
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uRes;               // CSS-style y-down pixels
    vec2 dir = vec2(sin(radians(152.0)), -cos(radians(152.0)));
    float len = abs(uRes.x * dir.x) + abs(uRes.y * dir.y);
    vec3 col = gradientStops(clamp(dot(px - 0.5 * uRes, dir) / len + 0.5, 0.0, 1.0));

    // radial-gradient(circle at 48% 50%, rgba(255,95,45,.1), transparent 48%)
    vec2 gc = vec2(0.48, 0.5) * uRes;
    float far = length(max(gc, uRes - gc));
    float g = 1.0 - clamp(length(px - gc) / far / 0.48, 0.0, 1.0);
    col = mix(col, vec3(1.0, 0.373, 0.176), 0.1 * g);

    // Ember canvas (was a 2D canvas at 0.9 opacity): rising sparks + central bloom.
    float h1, h2, h3;
    float e = emberLayer(p, 9.0, 0.10, 1.0, h1)
            + emberLayer(p, 16.0, 0.17, 4.0, h2) * 0.7
            + emberLayer(p, 26.0, 0.26, 9.0, h3) * 0.45;
    vec3 ember = vec3(1.0, 0.45, 0.32) * e * 0.55 + vec3(0.9, 0.3, 0.2) * (h1 + h2 + h3);
    float pulse = 0.92 + 0.08 * sin(uTime * 1.8);
    float r = length(p);
    vec3 bloom = vec3(0.86, 0.24, 0.2) * exp(-r * r * 120.0) * 0.16 * pulse
               + vec3(1.0, 0.78, 0.47) * exp(-r * r * 400.0) * 0.12 * pulse;
    col += (ember + bloom) * 0.9;

    // Vignette: radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,.72))
    float vt = length((uv - 0.5) * 2.0) / sqrt(2.0);
    col *= 1.0 - 0.72 * clamp((vt - 0.38) / 0.62, 0.0, 1.0);

    vec4 text = texture(uText, uv) * uTextAlpha;
    return col * (1.0 - text.a) + text.rgb;
}

// ---------------------------------------------------------------- blade SDF
struct Blade { vec3 tip, D, E, B; };

Blade makeBlade(float s) {
    Blade b;
    b.D = BLADE_DIR;
    vec3 e0 = normalize(cross(b.D, vec3(0.0, 0.0, 1.0)));
    vec3 b0 = cross(b.D, e0);
    b.E = cos(BLADE_ROLL) * e0 + sin(BLADE_ROLL) * b0;   // toward the cutting edge
    b.B = cross(b.D, b.E);                               // flat-of-blade normal
    b.tip = IMPACT + b.D * s;
    return b;
}

// Returns distance; info = (u: distance back from the tip, e: 0 spine .. 1 edge, w: across the flat)
float bladeSDF(vec3 pos, Blade b, out vec3 info) {
    vec3 q = pos - b.tip;
    float u = dot(q, -b.D);
    float v = dot(q, b.E) - SORI * u * u;
    float w = dot(q, b.B);
    float k = clamp(u / KISSAKI, 0.0, 1.0);
    float vMin = -HW;                              // straight spine (mune)
    float vMax = -HW + 2.0 * HW * sqrt(k);         // edge curves up into the tip (kissaki)
    float dv = max(vMin - v, v - vMax);
    float e = clamp((v - vMin) / (2.0 * HW), 0.0, 1.0);
    float halfT = HT * (1.0 - 0.88 * e * e) * mix(0.35, 1.0, k);  // wedge: thick spine, thin edge
    float dw = abs(w) - halfT;
    float du = max(-u, u - BLADE_LEN);
    info = vec3(u, e, w);
    return max(max(dv, dw), du);
}

float bladeDist(vec3 pos, Blade b) { vec3 i; return bladeSDF(pos, b, i); }

vec3 bladeNormal(vec3 pos, Blade b) {
    const vec2 k = vec2(1.0, -1.0) * 0.0004;
    return normalize(k.xyy * bladeDist(pos + k.xyy, b) + k.yyx * bladeDist(pos + k.yyx, b)
                   + k.yxy * bladeDist(pos + k.yxy, b) + k.xxx * bladeDist(pos + k.xxx, b));
}

// Closest approach between a ray and a segment; returns distance, tRay = ray parameter.
float raySegment(vec3 ro, vec3 rd, vec3 a, vec3 b, out float tRay) {
    vec3 ba = b - a, w0 = ro - a;
    float bb = dot(rd, ba), cc = dot(ba, ba), dd = dot(rd, w0), ee = dot(ba, w0);
    float den = max(cc - bb * bb, 1e-6);
    float u = clamp((ee - bb * dd) / den, 0.0, 1.0);
    vec3 qp = a + ba * u;
    tRay = max(dot(qp - ro, rd), 0.0);
    return length(ro + rd * tRay - qp);
}

// ---------------------------------------------------------------- PBR
float D_GGX(float NoH, float a) {
    float a2 = a * a;
    float d = NoH * NoH * (a2 - 1.0) + 1.0;
    return a2 / (PI * d * d);
}
float V_SmithGGX(float NoV, float NoL, float a) {
    float gv = NoL * (NoV * (1.0 - a) + a);
    float gl = NoV * (NoL * (1.0 - a) + a);
    return 0.5 / (gv + gl + 1e-5);
}
vec3 F_Schlick(vec3 F0, float VoH) { return F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0); }
// Karis' analytic fit of the split-sum environment BRDF.
vec3 envBRDF(vec3 F0, float rough, float NoV) {
    const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
    const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
    vec4 r = rough * c0 + c1;
    float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
    vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw;
    return F0 * AB.x + AB.y;
}

// Procedural studio environment (linear): warm softbox strip, ember glow from below.
vec3 envMap(vec3 d, float rough) {
    vec3 col = mix(vec3(0.02, 0.015, 0.018), vec3(0.20, 0.20, 0.23), smoothstep(-0.25, 0.8, d.y));
    col += vec3(0.5, 0.5, 0.55) * (1.0 - smoothstep(0.0, 0.25 + rough, abs(d.y - 0.05))) * 0.35; // horizon band
    float wdt = 0.06 + rough * 0.45;
    float strip = (1.0 - smoothstep(0.0, wdt, abs(d.y - 0.5 - 0.15 * d.x))) * smoothstep(-0.6, 0.2, d.z);
    col += vec3(1.0, 0.92, 0.84) * strip * mix(3.0, 0.9, rough);
    float side = (1.0 - smoothstep(0.0, wdt * 2.0, abs(d.x + 0.75))) * smoothstep(-0.2, 0.6, d.y);
    col += vec3(0.85, 0.85, 0.95) * side * 0.8;
    col += vec3(1.0, 0.32, 0.12) * smoothstep(0.0, 0.7, -d.y) * 0.5;
    return col;
}

vec3 directLight(vec3 N, vec3 V, vec3 L, vec3 radiance, vec3 F0, float rough) {
    vec3 H = normalize(V + L);
    float NoL = max(dot(N, L), 0.0), NoV = max(dot(N, V), 1e-4);
    float a = rough * rough;
    vec3 F = F_Schlick(F0, max(dot(V, H), 0.0));
    return D_GGX(max(dot(N, H), 0.0), a) * V_SmithGGX(NoV, NoL, a) * F * radiance * NoL;
}

const vec3 KEY_L = vec3(-0.40, 0.70, 0.59);   // normalized below
const vec3 RIM_L = vec3(0.55, -0.45, 0.30);

vec3 shadeBlade(vec3 pos, vec3 N, vec3 V, vec3 info) {
    float u = info.x, e = info.y;
    // Hamon: wavy temper line separating the frosty edge steel from the polished body.
    float hamonLine = 0.6 + 0.05 * sin(u * 70.0) + 0.03 * sin(u * 173.0 + 1.3);
    float hamon = smoothstep(hamonLine - 0.02, hamonLine + 0.02, e);
    float brushed = hash12(vec2(floor(u * 900.0), floor(info.z * 4000.0)));
    vec3 F0 = mix(vec3(0.56, 0.57, 0.58), vec3(0.74, 0.74, 0.76), hamon) * (0.96 + 0.04 * brushed);
    float rough = mix(0.13 + 0.04 * brushed, 0.34, hamon);

    float NoV = max(dot(N, V), 1e-4);
    vec3 R = reflect(-V, N);
    vec3 col = envMap(R, rough) * envBRDF(F0, rough, NoV);
    col += directLight(N, V, normalize(KEY_L), vec3(1.0, 0.93, 0.86) * 3.2, F0, rough);
    col += directLight(N, V, normalize(RIM_L), vec3(1.0, 0.36, 0.16) * 2.0, F0, rough);
    // Glow from the impact point spilling onto the steel.
    vec3 toI = IMPACT - pos;
    float dI = length(toI);
    col += directLight(N, V, toI / dI, vec3(1.0, 0.45, 0.2) * 0.25 / (0.02 + dI * dI), F0, max(rough, 0.2));
    // Sharpened edge catches a thin line of light.
    col += vec3(1.0, 0.95, 0.9) * smoothstep(0.965, 1.0, e) * 0.35 * (0.6 + 0.4 * brushed);
    // Contact occlusion where the blade passes through the glass.
    col *= mix(0.35, 1.0, smoothstep(0.0, 0.06, abs(pos.z)));
    return col;
}

// ---------------------------------------------------------------- cracks
// Voronoi in log-polar space, periodic in the angular axis.
// Returns distance (in cell units) to the nearest border; cellId and the border
// normal (pointing from this cell toward the border) in cell space.
float crackVoronoi(vec2 x, out vec2 cellId, out vec2 edgeN) {
    vec2 n = floor(x), f = fract(x);
    vec2 mg = vec2(0.0), mr = vec2(0.0);
    float md = 8.0;
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 id = n + g; id.y = mod(id.y, ANG_CELLS);
        vec2 r = g + 0.1 + 0.8 * hash22(id) - f;
        float d = dot(r, r);
        if (d < md) { md = d; mr = r; mg = g; }
    }
    cellId = n + mg; cellId.y = mod(cellId.y, ANG_CELLS);
    md = 8.0;
    edgeN = vec2(1.0, 0.0);
    for (int j = -2; j <= 2; j++)
    for (int i = -2; i <= 2; i++) {
        vec2 g = mg + vec2(float(i), float(j));
        vec2 id = n + g; id.y = mod(id.y, ANG_CELLS);
        vec2 r = g + 0.1 + 0.8 * hash22(id) - f;
        vec2 dr = r - mr;
        if (dot(dr, dr) > 1e-5) {
            vec2 nn = normalize(dr);
            float d = dot(0.5 * (mr + r), nn);
            if (d < md) { md = d; edgeN = nn; }
        }
    }
    return md;
}

// ---------------------------------------------------------------- main
void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;       // aspect-correct, y in [-0.5, 0.5]
    float pxSize = 1.0 / uRes.y;

    float s = mix(S_MIN, S_MAX, uProgress);                  // blade tip past the screen plane
    vec3 ro = vec3(0.0, 0.0, CAM_Z);
    vec3 rd = normalize(vec3(p, -CAM_Z));
    float tPlane = CAM_Z / -rd.z;

    // ---- glass: crack height field, shard normals, displacement
    vec2 c = p - IMPACT.xy;
    float r = length(c);
    float crackR = s < 0.0 ? 0.05 * smoothstep(-0.06, 0.0, s)
                           : 0.06 + 1.1 * pow(clamp(s / S_MAX, 0.0, 1.0), 0.75);
    float holeR = s > 0.0 ? mix(0.022, 0.05, smoothstep(0.0, 0.25, s)) : 0.0;
    vec3 N = vec3(0.0, 0.0, 1.0);
    vec2 disp = vec2(0.0);
    float crack = 0.0, inHole = 0.0, shard = 0.0, cellRnd = 0.0;

    // Pre-impact: the tip presses the screen outward and heats it.
    float press = smoothstep(S_MIN, 0.0, s) * (s < 0.02 ? 1.0 : exp(-(s - 0.02) * 12.0));
    disp -= c * press * 0.5 * exp(-r * r / 0.004);

    if (r < crackR * 1.3) {
        vec2 cs = c / max(r, 1e-4);
        vec2 q = vec2(log(max(r, 0.004)) * RAD_SCALE, atan(c.y, c.x) * ANG_CELLS / (2.0 * PI));
        vec2 id, en;
        float md = crackVoronoi(q, id, en);
        cellRnd = hash12(id + 17.0);
        // Map the border normal and distance from log-polar cell space to screen space.
        vec2 gs = (en.x * RAD_SCALE * cs + en.y * (ANG_CELLS / (2.0 * PI)) * vec2(-cs.y, cs.x)) / max(r, 0.004);
        float gl = max(length(gs), 1e-4);
        vec2 ns = gs / gl;                              // toward the border, screen space
        float dEdge = md / gl;                          // distance to the crack, screen units

        float reach = crackR * (0.7 + 0.3 * cellRnd);   // irregular outer boundary of the cracked zone
        float fade = 1.0 - smoothstep(reach * 0.75, reach, r);
        shard = fade;
        float rel = clamp(r / max(crackR, 1e-3), 0.0, 1.0);
        float wPx = mix(1.8, 0.55, sqrt(rel)) * uRes.y / 1080.0;
        float wd = max(wPx, 0.5) * pxSize;
        // Cracks thin out and fade toward the edge of the cracked zone.
        crack = (1.0 - smoothstep(wd * 0.5, wd * 1.5, dEdge)) * fade * mix(1.0, 0.45, rel);

        // Height map: V-groove along every crack. Its gradient tilts the normal toward the groove.
        float gw = wd * 2.5;
        float hSlope = 2.0 * dEdge / (gw * gw) * exp(-dEdge * dEdge / (gw * gw)) * gw;
        vec2 grooveTilt = ns * hSlope * 0.6 * fade;

        // Per-shard tilt, plus outward bending where the blade forces the glass forward.
        float push = exp(-r / 0.12) * clamp(s * 6.0, 0.0, 1.0);
        vec2 tilt = (hash22(id) - 0.5) * 0.07 * fade * (1.0 - 0.6 * rel) + cs * push * 0.3;
        N = normalize(vec3(tilt + grooveTilt, 1.0));     // normal blend: shard facets + crack height field

        disp += N.xy * (0.002 + 0.012 * exp(-r / 0.12)) * fade;
        disp += (hash22(id + 3.1) - 0.5) * 0.0015 * fade * (1.0 - rel);  // shards slip out of register
        inHole = step(r, holeR * (0.75 + 0.6 * cellRnd));
    }

    // Shockwave ring after break-through.
    float ring = 0.0;
    if (uImpactAge >= 0.0 && uImpactAge < 1.2) {
        float rr = uImpactAge * 1.6;
        float k = exp(-uImpactAge * 3.5);
        ring = exp(-pow((r - rr) / 0.02, 2.0)) * k;
        disp += c / max(r, 1e-4) * ring * 0.012;
    }

    vec2 dp = disp;                                          // in aspect space
    vec2 duv = vec2(dp.x * uRes.y / uRes.x, dp.y);
    vec3 scr;
    if (crack > 0.01) {                                      // dispersion along fracture lines
        scr.r = screenContent(uv + duv * 1.15, p + dp * 1.15).r;
        scr.g = screenContent(uv + duv, p + dp).g;
        scr.b = screenContent(uv + duv * 0.85, p + dp * 0.85).b;
    } else {
        scr = screenContent(uv + duv, p + dp);
    }
    vec3 col = toLinear(scr);

    // Glass lighting: glints on tilted shards, light caught in the fractures.
    vec3 V = -rd;
    if (shard > 0.0) {
        vec3 F0g = vec3(0.04);
        vec3 spec = directLight(N, V, normalize(KEY_L), vec3(1.0, 0.93, 0.86) * 2.4, F0g, 0.07)
                  + directLight(N, V, normalize(RIM_L), vec3(1.0, 0.4, 0.2) * 1.6, F0g, 0.1);
        vec3 refl = envMap(reflect(-V, N), 0.05) * envBRDF(F0g, 0.05, max(dot(N, V), 1e-4));
        col = col * (1.0 - 0.05 * shard) + (spec + refl * 0.15) * shard;
        col += vec3(1.0, 0.9, 0.82) * crack * (0.08 + 0.6 * pow(max(dot(reflect(-normalize(KEY_L), N), V), 0.0), 6.0));
    }
    col += vec3(1.0, 0.75, 0.55) * ring * 0.35;

    // Heat at the pressure point and a flash when the tip breaks through.
    col += vec3(1.0, 0.45, 0.18) * press * exp(-r * r / 0.0012) * 0.9;
    if (uImpactAge >= 0.0) col += vec3(1.0, 0.85, 0.7) * exp(-uImpactAge * 9.0) * exp(-r * r / 0.02) * 1.2;

    // Sparks thrown off at break-through.
    if (uImpactAge >= 0.0 && uImpactAge < 0.9) {
        for (int i = 0; i < 18; i++) {
            float fi = float(i);
            vec2 h = hash22(vec2(fi, 3.7));
            float ang = h.x * 2.0 * PI;
            float spd = 0.35 + 0.9 * h.y;
            vec2 v0 = vec2(cos(ang), sin(ang)) * spd;
            float t1 = uImpactAge, t0 = max(uImpactAge - 0.035, 0.0);
            vec2 a = IMPACT.xy + v0 * t0 + vec2(0.0, -0.7) * t0 * t0;
            vec2 b = IMPACT.xy + v0 * t1 + vec2(0.0, -0.7) * t1 * t1;
            vec2 pa = p - a, ba = b - a;
            float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
            float d = length(pa - ba * hh);
            float life = 1.0 - t1 / 0.9;
            col += vec3(1.0, 0.6, 0.25) * (1.0 - smoothstep(0.0, 0.0025, d)) * life * life * 2.0;
        }
    }

    // Contact shadow of the blade on the glass around the entry slot.
    if (s > 0.0) {
        float dAx = length(cross(vec3(p, 0.0) - IMPACT, BLADE_DIR));   // distance to the blade axis
        col *= mix(0.5, 1.0, smoothstep(HW * 0.8, HW * 5.0, dAx));
    }

    // Hole: glass is gone; behind it is the dark cavity of the screen.
    if (inHole > 0.5) col = vec3(0.006, 0.002, 0.003) + vec3(0.06, 0.015, 0.008) * exp(-r * 40.0);

    // ---- blade
    if (s > 0.0) {
        Blade bl = makeBlade(s);
        float tc;
        float segLen = s + 0.3;                        // visible part plus what shows through the hole
        vec3 segA = bl.tip, segB = bl.tip - bl.D * segLen;
        float dSeg = raySegment(ro, rd, segA, segB, tc);
        if (dSeg < HW * 2.0 + SORI * segLen * segLen + 0.01) {   // cheap bound: skip most pixels
            float t = max(tc - 0.3, 0.01);
            float tMax = tc + 0.3;
            float hitT = -1.0;
            vec3 info;
            for (int i = 0; i < 64; i++) {
                vec3 pos = ro + rd * t;
                float d = bladeSDF(pos, bl, info);
                if (d < 0.00025 * t) { hitT = t; break; }
                t += d * 0.7;
                if (t > tMax) break;
            }
            if (hitT > 0.0) {
                vec3 pos = ro + rd * hitT;
                bool inFront = hitT < tPlane;
                if (inFront || inHole > 0.5) {
                    vec3 Nb = bladeNormal(pos, bl);
                    vec3 bc = shadeBlade(pos, Nb, V, info);
                    col = inFront ? bc : bc * 0.25;   // behind the glass it sits in shadow
                }
            }
        }
    }

    outColor = vec4(toSRGB(rolloff(col)), 1.0);
}
`
