import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  ColorValue,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";

// ── Icons ───────────────────────────────────────────────
// One name → SF Symbol on iOS, Material Symbol on Android/web.
type PlatformNames = Exclude<SymbolViewProps["name"], string>;
type SFSymbol = NonNullable<PlatformNames["ios"]>;
type AndroidSymbol = NonNullable<PlatformNames["android"]>;

const ICONS = {
  learn: { ios: "house.fill", android: "home" },
  library: { ios: "books.vertical.fill", android: "library_books" },
  profile: { ios: "person.crop.circle.fill", android: "person" },
  add: { ios: "plus", android: "add" },
  flame: { ios: "flame.fill", android: "local_fire_department" },
  bolt: { ios: "bolt.fill", android: "bolt" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  doc: { ios: "doc.text.fill", android: "description" },
  upload: { ios: "square.and.arrow.up.fill", android: "upload_file" },
  paste: { ios: "doc.on.clipboard.fill", android: "content_paste" },
  check: { ios: "checkmark", android: "check" },
  close: { ios: "xmark", android: "close" },
  back: { ios: "chevron.left", android: "arrow_back" },
  chevron: { ios: "chevron.right", android: "chevron_right" },
  star: { ios: "star.fill", android: "star" },
  trophy: { ios: "trophy.fill", android: "emoji_events" },
  trash: { ios: "trash.fill", android: "delete" },
  brain: { ios: "brain.head.profile", android: "psychology" },
  cards: { ios: "rectangle.on.rectangle.angled", android: "style" },
  quiz: { ios: "questionmark.circle.fill", android: "quiz" },
  lock: { ios: "lock.fill", android: "lock" },
  school: { ios: "graduationcap.fill", android: "school" },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: ColorValue }) {
  const n = ICONS[name];
  return (
    <SymbolView
      name={{ ios: n.ios, android: n.android, web: n.android }}
      size={size}
      tintColor={color}
      weight="semibold"
      style={{ width: size, height: size }}
    />
  );
}

// ── Chunky 3D button ────────────────────────────────────
type ButtonProps = {
  label: string;
  onPress?: () => void;
  color?: string;
  shadowColor?: string;
  textColor?: string;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "outline";
  style?: StyleProp<ViewStyle>;
};

const DEPTH = 5;

export function ChunkyButton({
  label,
  onPress,
  color = colors.primary,
  shadowColor = colors.primaryShadow,
  textColor = colors.text,
  icon,
  disabled,
  loading,
  variant = "solid",
  style,
}: ButtonProps) {
  const outline = variant === "outline";
  const inactive = disabled || loading;
  const face = inactive ? colors.locked : outline ? colors.surface : color;
  const edge = inactive ? "#2e1240" : outline ? colors.border : shadowColor;
  const fg = inactive ? colors.lockedText : outline ? colors.textMuted : textColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      style={[{ borderRadius: 18, backgroundColor: edge, paddingBottom: DEPTH }, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.buttonFace,
            {
              backgroundColor: face,
              borderColor: outline ? colors.border : face,
              transform: [{ translateY: pressed && !inactive ? DEPTH - 1 : 0 }],
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={fg} />
          ) : (
            <>
              {icon ? <Icon name={icon} size={20} color={fg} /> : null}
              <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── Progress bar ────────────────────────────────────────
export function ProgressBar({
  value,
  color = colors.xp,
  height = 14,
  style,
}: {
  value: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[{ height, borderRadius: height, backgroundColor: colors.surfaceRaised, overflow: "hidden" }, style]}
    >
      <View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: height, backgroundColor: color }}>
        {/* glossy highlight */}
        <View
          style={{
            position: "absolute",
            top: height * 0.2,
            left: 8,
            right: 8,
            height: Math.max(3, height * 0.22),
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </View>
    </View>
  );
}

// ── Stat pill (streak / XP) ─────────────────────────────
export function StatPill({ icon, value, color }: { icon: IconName; value: string | number; color: string }) {
  return (
    <View style={styles.pill}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

// ── Card ────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  buttonFace: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceRaised,
  },
  pillText: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.surfaceRaised,
    padding: 18,
  },
  heading: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  muted: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
});
