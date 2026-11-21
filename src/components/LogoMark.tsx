import { StyleSheet, View, type ViewStyle } from "react-native";

import { brand } from "@/theme/colors";

/**
 * The Cognify mark — the same "stack of notes" as the app icon, in the fixed
 * brand colours
 * (assets/expo.icon/Assets/cognify-notes.svg), drawn with Views so it stays
 * crisp at any size without an SVG library.
 *
 * Shapes use the icon's 1024×1024 coordinates; the whole drawing is scaled
 * down to `size`. MARK_ZOOM and MARK_SHIFT match the icon's
 * `translate(512 512) scale(1.4) translate(-512 -500)`.
 */
const CANVAS = 1024;
const MARK_ZOOM = 1.4;
const MARK_SHIFT = 12;

type Shape = { x: number; y: number; w: number; h: number; r: number; color: string; rotate?: number };

const SHAPES: Shape[] = [
  { x: 312, y: 372, w: 400, h: 300, r: 52, color: brand.backCard, rotate: -12 },
  { x: 312, y: 356, w: 400, h: 300, r: 52, color: brand.middleCard, rotate: 7 },
  { x: 312, y: 330, w: 400, h: 300, r: 52, color: brand.note }, // front note
  { x: 372, y: 398, w: 150, h: 34, r: 17, color: brand.headingLine },
  { x: 372, y: 462, w: 280, h: 30, r: 15, color: brand.line },
  { x: 372, y: 520, w: 220, h: 30, r: 15, color: brand.line },
];

export function LogoMark({ size = 32, style }: { size?: number; style?: ViewStyle }) {
  const offset = (size - CANVAS) / 2;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.225 }, style]}
    >
      <View
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          width: CANVAS,
          height: CANVAS,
          transform: [{ scale: (size / CANVAS) * MARK_ZOOM }],
        }}
      >
        {SHAPES.map((s, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + MARK_SHIFT,
              width: s.w,
              height: s.h,
              borderRadius: s.r,
              backgroundColor: s.color,
              transform: s.rotate ? [{ rotate: `${s.rotate}deg` }] : undefined,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// The logo looks the same in light and dark mode.
const styles = StyleSheet.create({
  tile: { backgroundColor: brand.tile, overflow: "hidden" },
});
