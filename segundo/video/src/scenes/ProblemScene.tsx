import { AbsoluteFill } from "remotion";
import { SceneFrame } from "../components/SceneFrame";
import { FadeIn } from "../components/FadeIn";
import { colors, fonts } from "../theme";

interface StatProps {
  number: string;
  label: string;
  detail: string;
  delay: number;
}

const StatCard: React.FC<StatProps> = ({ number, label, detail, delay }) => {
  return (
    <FadeIn delay={delay} duration={26} from="bottom" distance={22}>
      <div
        style={{
          width: 380,
          height: 380,
          padding: 38,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: colors.neutral500,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 124,
            lineHeight: 1,
            color: colors.gold500,
            fontFeatureSettings: '"tnum"',
            letterSpacing: "-0.02em",
          }}
        >
          {number}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 20,
            lineHeight: 1.4,
            color: colors.neutral200,
          }}
        >
          {detail}
        </div>
      </div>
    </FadeIn>
  );
};

export const ProblemScene: React.FC = () => {
  return (
    <SceneFrame label="El problema real">
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <FadeIn delay={4} duration={24} from="bottom" distance={16}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 62,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: colors.neutral50,
              textAlign: "center",
              maxWidth: 1200,
            }}
          >
            En una PyME de 3 a 15 personas,
            <br />
            el dueño <span style={{ color: colors.gold500 }}>paga lo mismo tres veces</span>.
          </div>
        </FadeIn>

        <div style={{ display: "flex", gap: 32 }}>
          <StatCard
            delay={32}
            number="3-5"
            label="Días por persona"
            detail="Capacita al mismo puesto cada vez que rota alguien."
          />
          <StatCard
            delay={52}
            number="20+"
            label="Interrupciones al día"
            detail="Dudas básicas que solo el dueño sabe responder."
          />
          <StatCard
            delay={72}
            number="0"
            label="Memoria del negocio"
            detail="Si renuncia el empleado clave, el conocimiento se va."
          />
        </div>

        <FadeIn delay={108} duration={22} from="bottom" distance={12}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 22,
              color: colors.neutral400,
              textAlign: "center",
              letterSpacing: "0.01em",
            }}
          >
            El conocimiento del negocio vive en la cabeza del dueño. Y se pierde.
          </div>
        </FadeIn>
      </AbsoluteFill>
    </SceneFrame>
  );
};
