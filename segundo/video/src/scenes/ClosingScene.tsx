import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { colors, fonts } from "../theme";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordmarkScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 70, mass: 0.7 },
    from: 0.94,
    to: 1,
  });
  const wordmarkOpacity = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle gold dot blink
  const dotScale = 1 + Math.sin(frame / 6) * 0.04;

  return (
    <SceneFrame>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            opacity: wordmarkOpacity,
            transform: `scale(${wordmarkScale})`,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 220,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: colors.neutral50,
            }}
          >
            Segundo
          </div>
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: colors.gold500,
              marginBottom: 30,
              transform: `scale(${dotScale})`,
            }}
          />
        </div>

        <FadeIn delay={24} duration={26} from="bottom" distance={14}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 52,
              lineHeight: 1.2,
              color: colors.gold500,
              textAlign: "center",
              letterSpacing: "-0.01em",
            }}
          >
            El colega que nunca renuncia.
          </div>
        </FadeIn>

        <FadeIn delay={48} duration={22} from="bottom" distance={10}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 22,
              color: colors.neutral300,
              textAlign: "center",
              maxWidth: 880,
              lineHeight: 1.55,
              marginTop: 12,
            }}
          >
            Para PyMEs latinoamericanas. En español, sin jerga,
            <br />
            con el conocimiento real de tu negocio.
          </div>
        </FadeIn>

        <FadeIn delay={80} duration={20} from="bottom" distance={8}>
          <div
            style={{
              marginTop: 28,
              padding: "14px 28px",
              border: `1px solid ${colors.gold500}`,
              borderRadius: 999,
              fontFamily: fonts.sans,
              fontSize: 16,
              fontWeight: 600,
              color: colors.gold500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            usasegundo.com · prueba 13 días
          </div>
        </FadeIn>
      </AbsoluteFill>
    </SceneFrame>
  );
};
