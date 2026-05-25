import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { colors, fonts } from "../theme";

const INTERRUPTIONS = [
  "¿Cuánto cobramos por el envío?",
  "¿Los lunes abrimos?",
  "¿Aceptamos tarjeta?",
  "¿Hay descuento por mayoreo?",
  "¿Dónde guardamos los recibos?",
];

const Interruption: React.FC<{ text: string; delay: number; x: number; y: number }> = ({
  text,
  delay,
  x,
  y,
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  const opacity = interpolate(local, [0, 8, 60, 75], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(local, [0, 12], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `translateY(${ty}px)`,
        fontFamily: fonts.sans,
        fontSize: 22,
        color: colors.neutral400,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        padding: "12px 20px",
        borderRadius: 14,
        maxWidth: 380,
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
};

export const HookScene: React.FC = () => {
  return (
    <SceneFrame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {INTERRUPTIONS.map((text, i) => {
          const positions = [
            { x: 140, y: 200 },
            { x: 1380, y: 280 },
            { x: 200, y: 720 },
            { x: 1300, y: 760 },
            { x: 1500, y: 540 },
          ];
          return (
            <Interruption
              key={i}
              text={text}
              delay={4 + i * 6}
              x={positions[i].x}
              y={positions[i].y}
            />
          );
        })}

        <FadeIn delay={48} duration={26} from="bottom" distance={18}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 104,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: colors.neutral50,
              textAlign: "center",
              maxWidth: 1400,
            }}
          >
            Tu equipo te pregunta
            <br />
            <span style={{ color: colors.gold500 }}>todo el día.</span>
          </div>
        </FadeIn>

        <FadeIn delay={72} duration={22} from="bottom" distance={12}>
          <div
            style={{
              marginTop: 40,
              fontFamily: fonts.sans,
              fontSize: 26,
              color: colors.neutral400,
              letterSpacing: "0.01em",
              textAlign: "center",
            }}
          >
            Y tú no puedes parar tu trabajo cada vez.
          </div>
        </FadeIn>
      </AbsoluteFill>
    </SceneFrame>
  );
};
