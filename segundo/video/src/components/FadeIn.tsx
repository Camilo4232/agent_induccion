import { ReactNode } from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  from?: "bottom" | "top" | "left" | "right" | "none";
  distance?: number;
  style?: React.CSSProperties;
}

export const FadeIn: React.FC<Props> = ({
  children,
  delay = 0,
  duration = 24,
  from = "bottom",
  distance = 24,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delay;

  const opacity = interpolate(local, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.6 },
  });
  const offset = interpolate(progress, [0, 1], [distance, 0]);

  let transform = "none";
  if (from === "bottom") transform = `translateY(${offset}px)`;
  else if (from === "top") transform = `translateY(${-offset}px)`;
  else if (from === "left") transform = `translateX(${-offset}px)`;
  else if (from === "right") transform = `translateX(${offset}px)`;

  return (
    <div style={{ ...style, opacity, transform, willChange: "transform, opacity" }}>
      {children}
    </div>
  );
};
