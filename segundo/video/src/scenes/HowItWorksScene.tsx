import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { AppFrame } from "../components/AppFrame";
import { Typewriter } from "../components/Typewriter";
import { colors, fonts } from "../theme";

const QUESTION = "¿Hacen descuento si compro varias cajas?";
const ANSWER =
  "Sí. Desde 50 piezas aplica 15% de descuento, solo en ferretería (no en herramienta eléctrica). María lo enseñó el mes pasado.";

const TypingDots: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame >= endFrame) return null;
  const phase = Math.floor((frame - startFrame) / 6) % 3;
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 6,
        padding: "14px 18px",
        backgroundColor: colors.surface,
        borderLeft: `4px solid ${colors.gold500}`,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: i === phase ? colors.gold500 : colors.neutral600,
            transition: "background 120ms",
          }}
        />
      ))}
      <span
        style={{
          marginLeft: 8,
          fontFamily: fonts.sans,
          fontSize: 13,
          color: colors.neutral500,
        }}
      >
        Segundo está buscando en lo que María le enseñó…
      </span>
    </div>
  );
};

const Bubble: React.FC<{
  startFrame: number;
  side: "user" | "assistant";
  children: React.ReactNode;
  badges?: { label: string; tone: "gold" | "neutral" }[];
}> = ({ startFrame, side, children, badges }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const opacity = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(local, [0, 18], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < startFrame) return null;

  if (side === "user") {
    return (
      <div
        style={{
          opacity,
          transform: `translateY(${ty}px)`,
          alignSelf: "flex-end",
          maxWidth: 480,
          backgroundColor: colors.surfaceElevated,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: "14px 18px",
          fontFamily: fonts.sans,
          fontSize: 16,
          color: colors.neutral100,
          lineHeight: 1.45,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        alignSelf: "flex-start",
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: colors.gold500,
        }}
      >
        Segundo responde
      </span>
      <div
        style={{
          backgroundColor: colors.surface,
          borderLeft: `4px solid ${colors.gold500}`,
          borderRadius: 12,
          padding: "14px 18px",
          fontFamily: fonts.sans,
          fontSize: 16,
          color: colors.neutral100,
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
      {badges && badges.length > 0 && (
        <div style={{ display: "flex", gap: 6 }}>
          {badges.map((b) => (
            <span
              key={b.label}
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 5,
                backgroundColor:
                  b.tone === "gold" ? "rgba(198, 151, 64, 0.12)" : colors.surface,
                color: b.tone === "gold" ? colors.gold400 : colors.neutral400,
                border: b.tone === "gold" ? "none" : `1px solid ${colors.border}`,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const HowItWorksScene: React.FC = () => {
  return (
    <SceneFrame label="02 · El empleado pregunta">
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 80 }}>
        {/* Left: narrative */}
        <div
          style={{
            width: 540,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            paddingRight: 40,
          }}
        >
          <FadeIn delay={4} duration={26} from="left" distance={20}>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 76,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: colors.neutral50,
              }}
            >
              Tu equipo pregunta. <span style={{ color: colors.gold500 }}>Segundo responde.</span>
            </div>
          </FadeIn>

          <FadeIn delay={28} duration={22} from="left" distance={14}>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 22,
                lineHeight: 1.5,
                color: colors.neutral300,
                maxWidth: 480,
              }}
            >
              Cualquier persona del equipo abre el chat y pregunta. Segundo contesta con lo que tú enseñaste, no con datos inventados.
            </div>
          </FadeIn>

          <FadeIn delay={80} duration={22} from="left" distance={10}>
            <div
              style={{
                padding: 20,
                borderRadius: 14,
                backgroundColor: "rgba(198, 151, 64, 0.07)",
                border: `1px solid rgba(198, 151, 64, 0.22)`,
                maxWidth: 480,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: colors.gold500,
                  marginBottom: 8,
                }}
              >
                Y si no sabe
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: colors.neutral100,
                }}
              >
                No inventa. Te pregunta a ti, y cuando le respondes queda aprendido para siempre.
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right: chat mockup */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <FadeIn delay={14} duration={28} from="right" distance={30}>
            <AppFrame width={900} height={620} tag="chat del empleado">
              <div
                style={{
                  padding: "24px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  height: "100%",
                }}
              >
                {/* Employee context */}
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    color: colors.neutral500,
                    letterSpacing: "0.04em",
                  }}
                >
                  Carlos, primer día · Lunes 10:24 a. m.
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    flex: 1,
                  }}
                >
                  <Bubble startFrame={30} side="user">
                    <Typewriter text={QUESTION} startFrame={30} charsPerFrame={1.4} cursor={false} />
                  </Bubble>

                  <div style={{ alignSelf: "flex-start" }}>
                    <TypingDots startFrame={86} endFrame={132} />
                  </div>

                  <Bubble
                    startFrame={132}
                    side="assistant"
                    badges={[
                      { label: "ventas", tone: "gold" },
                      { label: "fuente: 1 hecho", tone: "neutral" },
                      { label: "alta confianza", tone: "neutral" },
                    ]}
                  >
                    <Typewriter
                      text={ANSWER}
                      startFrame={132}
                      charsPerFrame={1.7}
                      cursor={false}
                    />
                  </Bubble>
                </div>

                {/* Input bar */}
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    backgroundColor: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: colors.neutral500,
                      fontSize: 12,
                    }}
                  >
                    🎤
                  </div>
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: colors.neutral500,
                      flex: 1,
                    }}
                  >
                    Pregunta lo que necesites…
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.neutral500,
                    }}
                  >
                    Enter
                  </span>
                </div>
              </div>
            </AppFrame>
          </FadeIn>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
