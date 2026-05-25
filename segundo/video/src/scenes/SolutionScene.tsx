import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { AppFrame } from "../components/AppFrame";
import { Typewriter } from "../components/Typewriter";
import { colors, fonts } from "../theme";

const TEACH_TEXT =
  "Desde 50 piezas damos 15% de descuento. Aplica solo en ferretería, no en herramienta eléctrica.";

const SavedCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const opacity = interpolate(local, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(local, [0, 18], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        backgroundColor: colors.surfaceElevated,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${colors.gold500}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: colors.gold500,
        }}
      >
        Hecho guardado
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 15,
          lineHeight: 1.45,
          color: colors.neutral100,
        }}
      >
        Descuento por mayoreo: 15% desde 50 piezas. Solo ferretería.
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 5,
            backgroundColor: "rgba(198, 151, 64, 0.12)",
            color: colors.gold400,
            fontFamily: fonts.sans,
            fontWeight: 600,
          }}
        >
          ventas
        </span>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 5,
            backgroundColor: colors.surface,
            color: colors.neutral400,
            fontFamily: fonts.sans,
            border: `1px solid ${colors.border}`,
          }}
        >
          precios
        </span>
      </div>
    </div>
  );
};

export const SolutionScene: React.FC = () => {
  return (
    <SceneFrame label="01 · El dueño enseña">
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 80 }}>
        {/* Left: narrative */}
        <div
          style={{
            width: 560,
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
              Le enseñas a <span style={{ color: colors.gold500 }}>Segundo</span> como a un empleado nuevo.
            </div>
          </FadeIn>

          <FadeIn delay={28} duration={22} from="left" distance={14}>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 22,
                lineHeight: 1.5,
                color: colors.neutral300,
                maxWidth: 520,
              }}
            >
              Escribes o hablas en tu idioma. Segundo entiende, lo guarda como un hecho del negocio, y queda disponible para siempre.
            </div>
          </FadeIn>

          <FadeIn delay={56} duration={20} from="left" distance={10}>
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 36,
                    color: colors.gold500,
                  }}
                >
                  1×
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    color: colors.neutral400,
                    maxWidth: 180,
                    lineHeight: 1.4,
                  }}
                >
                  Lo enseñas una vez.
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 36,
                    color: colors.gold500,
                  }}
                >
                  ∞
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    color: colors.neutral400,
                    maxWidth: 180,
                    lineHeight: 1.4,
                  }}
                >
                  Se queda contigo para siempre.
                </span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right: app mockup */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <FadeIn delay={14} duration={28} from="right" distance={30}>
            <AppFrame width={920} height={620} showTabs activeTab="Enseñar">
              <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Section title */}
                <div>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 26,
                      color: colors.neutral50,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Enseña a Segundo
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: colors.neutral500,
                      marginTop: 4,
                    }}
                  >
                    Cuéntale algo de tu negocio. Lo va a recordar para todos.
                  </div>
                </div>

                {/* Input box with typewriter */}
                <div
                  style={{
                    backgroundColor: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 18,
                    minHeight: 130,
                    fontFamily: fonts.sans,
                    fontSize: 17,
                    color: colors.neutral100,
                    lineHeight: 1.5,
                  }}
                >
                  <Typewriter
                    text={TEACH_TEXT}
                    startFrame={30}
                    charsPerFrame={1.1}
                  />
                </div>

                {/* Buttons row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.neutral400,
                        fontSize: 14,
                      }}
                    >
                      🎤
                    </div>
                    <span
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 12,
                        color: colors.neutral500,
                        alignSelf: "center",
                      }}
                    >
                      o dictalo por voz
                    </span>
                  </div>
                  <FadeIn delay={140} duration={14} from="none">
                    <div
                      style={{
                        padding: "10px 22px",
                        borderRadius: 10,
                        backgroundColor: colors.gold500,
                        color: colors.neutral900,
                        fontFamily: fonts.sans,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Guardar hecho
                    </div>
                  </FadeIn>
                </div>

                {/* Saved card appears */}
                {/* Saved card sits below */}
                <div style={{ marginTop: 6 }}>
                  <SavedCard startFrame={160} />
                </div>
              </div>
            </AppFrame>
          </FadeIn>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
