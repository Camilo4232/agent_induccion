import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { colors, fonts } from "../theme";

interface RowProps {
  before: string;
  after: string;
  delay: number;
}

const CompareRow: React.FC<RowProps> = ({ before, after, delay }) => (
  <FadeIn delay={delay} duration={24} from="bottom" distance={14}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 24,
        alignItems: "center",
        padding: "18px 0",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 22,
          color: colors.neutral400,
          lineHeight: 1.4,
          textDecoration: "line-through",
          textDecorationColor: colors.clay500,
        }}
      >
        {before}
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 22,
          color: colors.neutral500,
          fontWeight: 500,
        }}
      >
        →
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 22,
          color: colors.neutral50,
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        {after}
      </div>
    </div>
  </FadeIn>
);

const CountUp: React.FC<{
  startFrame: number;
  endValue: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}> = ({ startFrame, endValue, duration = 36, suffix = "", prefix = "" }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const t = interpolate(local, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - t, 3);
  const v = Math.round(endValue * eased);
  return (
    <span style={{ fontFeatureSettings: '"tnum"' }}>
      {prefix}
      {v}
      {suffix}
    </span>
  );
};

const KpiCard: React.FC<{
  delay: number;
  label: string;
  value: React.ReactNode;
  hint: string;
}> = ({ delay, label, value, hint }) => (
  <FadeIn delay={delay} duration={22} from="bottom" distance={14}>
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 22,
        minWidth: 220,
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
          color: colors.neutral500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 56,
          lineHeight: 1,
          color: colors.gold500,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 12,
          color: colors.neutral400,
        }}
      >
        {hint}
      </div>
    </div>
  </FadeIn>
);

export const ValueScene: React.FC = () => {
  return (
    <SceneFrame label="03 · El valor para el negocio">
      <AbsoluteFill style={{ flexDirection: "column", justifyContent: "center", gap: 36 }}>
        <FadeIn delay={4} duration={26} from="bottom" distance={16}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 64,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: colors.neutral50,
              maxWidth: 1300,
            }}
          >
            Lo que cambia <span style={{ color: colors.gold500 }}>desde el primer día</span>.
          </div>
        </FadeIn>

        <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>
          {/* Left: before / after rows */}
          <div style={{ flex: 1.2, paddingTop: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 24,
                paddingBottom: 12,
                borderBottom: `1px solid ${colors.borderStrong}`,
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: colors.neutral500,
              }}
            >
              <div>Antes</div>
              <div />
              <div style={{ color: colors.gold500 }}>Con Segundo</div>
            </div>

            <CompareRow
              delay={24}
              before="3 a 5 días capacitando al mismo puesto"
              after="Capacitas una vez, vale para todo el equipo"
            />
            <CompareRow
              delay={42}
              before="20 interrupciones al día al dueño"
              after="El equipo se autorresuelve por chat"
            />
            <CompareRow
              delay={60}
              before="Si renuncia, el conocimiento se va"
              after="El conocimiento se queda en el negocio"
            />
            <CompareRow
              delay={78}
              before="Manuales en Word que nadie lee"
              after="Respuestas exactas en 5 segundos"
            />
          </div>

          {/* Right: KPI panel */}
          <div
            style={{
              flex: 0.9,
              padding: 26,
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <FadeIn delay={20} duration={20} from="right" distance={14}>
              <div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: colors.gold500,
                    marginBottom: 4,
                  }}
                >
                  panel del dueño · esta semana
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 28,
                    color: colors.neutral50,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Métricas reales
                </div>
              </div>
            </FadeIn>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <KpiCard
                delay={42}
                label="Tasa de resolución"
                value={<CountUp startFrame={60} endValue={87} suffix="%" />}
                hint="sin pasar por el dueño"
              />
              <KpiCard
                delay={56}
                label="Preguntas / semana"
                value={<CountUp startFrame={74} endValue={142} />}
                hint="del equipo a Segundo"
              />
              <KpiCard
                delay={70}
                label="Hechos del negocio"
                value={<CountUp startFrame={88} endValue={68} prefix="+" />}
                hint="creciendo cada semana"
              />
              <KpiCard
                delay={84}
                label="Empleados activos"
                value={<CountUp startFrame={102} endValue={6} />}
                hint="usando Segundo hoy"
              />
            </div>
          </div>
        </div>

        <FadeIn delay={150} duration={22} from="bottom" distance={10}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 22,
              color: colors.neutral400,
              textAlign: "center",
              letterSpacing: "0.01em",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            El conocimiento del dueño se vuelve un{" "}
            <span style={{ color: colors.gold500 }}>activo permanente</span> del negocio.
          </div>
        </FadeIn>
      </AbsoluteFill>
    </SceneFrame>
  );
};
