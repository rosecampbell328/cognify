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
import { fonts } from "@/theme/type";

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
  camera: { ios: "camera.fill", android: "photo_camera" },
  pencil: { ios: "pencil", android: "edit" },
  send: { ios: "arrow.up", android: "send" },
  chat: { ios: "bubble.left.and.bubble.right.fill", android: "forum" },
  pdf: { ios: "doc.richtext.fill", android: "picture_as_pdf" },
  attach: { ios: "paperclip", android: "attach_file" },
  share: { ios: "square.and.arrow.up", android: "share" },
  people: { ios: "person.2.fill", android: "group" },
  personAdd: { ios: "person.badge.plus", android: "person_add" },
  search: { ios: "magnifyingglass", android: "search" },
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

// ── Button ──────────────────────────────────────────────
// Flat and soft: a gentle lift shadow, sentence-case label, slight press dip.
type ButtonProps = {
  label: string;
  onPress?: () => void;
  color?: string;
  textColor?: string;
  icon?: IconName;
  /** Put the icon after the label (e.g. a forward arrow). */
  iconAfter?: boolean;
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "outline";
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  color = colors.primary,
  textColor = colors.textOnPrimary,
  icon,
  iconAfter,
  disabled,
  loading,
  variant = "solid",
  style,
}: ButtonProps) {
  const outline = variant === "outline";
  const inactive = disabled || loading;
  const bg = inactive ? colors.locked : outline ? "transparent" : color;
  const fg = inactive ? colors.lockedText : outline ? colors.primary : textColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: outline ? colors.secondary : bg,
          boxShadow: outline || inactive ? undefined : colors.liftShadow,
          opacity: pressed && !inactive ? 0.88 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && !iconAfter ? <Icon name={icon} size={19} color={fg} /> : null}
          <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
          {icon && iconAfter ? <Icon name={icon} size={17} color={fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

// ── Progress bar ────────────────────────────────────────
export function ProgressBar({
  value,
  color = colors.progress,
  height = 8,
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
      style={[{ height, borderRadius: height, backgroundColor: colors.progressTrack, overflow: "hidden" }, style]}
    >
      <View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

// ── Stat pill (streak / XP) ─────────────────────────────
export function StatPill({ icon, value, color }: { icon: IconName; value: string | number; color: string }) {
  return (
    <View style={styles.pill}>
      <Icon name={icon} size={17} color={color} />
      <Text style={styles.pillText}>{value}</Text>
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

/** Small uppercase label used above sections and cards. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonLabel: { fontSize: 16, fontWeight: "700", letterSpacing: 0.1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  heading: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.4 },
  muted: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  eyebrow: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
});
