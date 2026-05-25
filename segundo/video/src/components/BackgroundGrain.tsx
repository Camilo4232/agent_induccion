import { AbsoluteFill } from "remotion";
import { colors } from "../theme";

export const BackgroundGrain: React.FC = () => {
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundColor: colors.bg,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${colors.neutral800} 0%, ${colors.bg} 70%)`,
          opacity: 0.6,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          opacity: 0.05,
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
};
