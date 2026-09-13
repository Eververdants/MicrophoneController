//! The tray status icon, drawn at runtime.
//!
//! Two bitmaps would mean two binary assets to keep in step with the palette
//! and no way to react to the theme. At 32x32 the glyph is a handful of
//! distance functions, so it is rasterised instead.
//!
//! Shape: a condenser microphone — capsule, holder arc, stem, base. Coverage is
//! sampled 3x3 per pixel so the strokes survive Windows scaling the icon down to
//! the 16px the notification area actually uses.

use tauri::image::Image;

/// Rendered size. Larger than the 16px Windows asks for, because scaling *down*
/// retains the stroke where scaling up would not.
const SIZE: u32 = 32;
const SAMPLES: u32 = 3;

/// Live: `--success`. Muted: `--fg-muted`. Slash: `--danger`. The icon sits on
/// the taskbar in either Windows theme, so these are the mid-tone variants
/// rather than the theme-specific ones.
const LIVE: [f32; 3] = [0x5f as f32, 0xb9 as f32, 0x83 as f32];
const MUTED: [f32; 3] = [0x9b as f32, 0x9b as f32, 0x94 as f32];
const SLASH: [f32; 3] = [0xf0 as f32, 0x71 as f32, 0x5a as f32];

/// Half-width of the slash and of the transparent gap cut around it.
const SLASH_RADIUS: f32 = 1.15;
const SLASH_GAP: f32 = 2.6;

pub fn render(muted: bool) -> Image<'static> {
    let mut rgba = vec![0u8; (SIZE * SIZE * 4) as usize];
    let samples = (SAMPLES * SAMPLES) as f32;

    for y in 0..SIZE {
        for x in 0..SIZE {
            // Premultiplied accumulation: colour must only be averaged over the
            // samples that are actually covered, or every edge pixel would be
            // dragged towards black.
            let mut acc = [0.0f32; 4];
            for sy in 0..SAMPLES {
                for sx in 0..SAMPLES {
                    let px = x as f32 + (sx as f32 + 0.5) / SAMPLES as f32;
                    let py = y as f32 + (sy as f32 + 0.5) / SAMPLES as f32;
                    if let Some(colour) = sample(px, py, muted) {
                        acc[0] += colour[0];
                        acc[1] += colour[1];
                        acc[2] += colour[2];
                        acc[3] += 1.0;
                    }
                }
            }

            let alpha = acc[3] / samples;
            let index = ((y * SIZE + x) * 4) as usize;
            if acc[3] > 0.0 {
                rgba[index] = (acc[0] / acc[3]).round() as u8;
                rgba[index + 1] = (acc[1] / acc[3]).round() as u8;
                rgba[index + 2] = (acc[2] / acc[3]).round() as u8;
            }
            rgba[index + 3] = (alpha * 255.0).round() as u8;
        }
    }

    Image::new_owned(rgba, SIZE, SIZE)
}

fn sample(x: f32, y: f32, muted: bool) -> Option<[f32; 3]> {
    if muted {
        let dist = slash_distance(x, y);
        // The gap is drawn first: it cuts the glyph so the slash stays visible
        // against a same-coloured microphone.
        if dist <= SLASH_GAP {
            return if dist <= SLASH_RADIUS { Some(SLASH) } else { None };
        }
    }
    if microphone(x, y) {
        return Some(if muted { MUTED } else { LIVE });
    }
    None
}

fn microphone(x: f32, y: f32) -> bool {
    // Body.
    capsule(x, y, 16.0, 9.6, 16.0, 17.4, 3.1)
        // Holder arc — the lower half of a ring around the body.
        || (y >= 15.0 && ring(x, y, 16.0, 15.0, 5.4, 0.85))
        // Stem.
        || capsule(x, y, 16.0, 20.4, 16.0, 23.4, 1.1)
        // Base.
        || capsule(x, y, 12.6, 25.2, 19.4, 25.2, 1.05)
}

fn slash_distance(x: f32, y: f32) -> f32 {
    segment_distance(x, y, 6.5, 6.5, 25.5, 25.5)
}

fn capsule(x: f32, y: f32, ax: f32, ay: f32, bx: f32, by: f32, radius: f32) -> bool {
    segment_distance(x, y, ax, ay, bx, by) <= radius
}

fn ring(x: f32, y: f32, cx: f32, cy: f32, radius: f32, thickness: f32) -> bool {
    let dx = x - cx;
    let dy = y - cy;
    ((dx * dx + dy * dy).sqrt() - radius).abs() <= thickness
}

fn segment_distance(x: f32, y: f32, ax: f32, ay: f32, bx: f32, by: f32) -> f32 {
    let vx = bx - ax;
    let vy = by - ay;
    let length_sq = vx * vx + vy * vy;
    let t = if length_sq == 0.0 {
        0.0
    } else {
        (((x - ax) * vx + (y - ay) * vy) / length_sq).clamp(0.0, 1.0)
    };
    let px = ax + t * vx;
    let py = ay + t * vy;
    ((x - px).powi(2) + (y - py).powi(2)).sqrt()
}
