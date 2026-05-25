import { ReactNode } from "react";
import { colors, fonts } from "../theme";

interface Props {
  children: ReactNode;
  width?: number;
  height?: number;
  tag?: string;
  showTabs?: boolean;
  activeTab?: string;
}

const TABS = ["Enseñar", "Conocimiento", "Bandeja", "Métricas", "Equipo"];

export const AppFrame: React.FC<Props> = ({
  children,
  width = 980,
  height = 640,
  tag = "panel del dueño",
  showTabs = false,
  activeTab = "Enseñar",
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* App header */}
      <div
        style={{
          height: 56,
          padding: "0 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              color: colors.neutral50,
              letterSpacing: "-0.01em",
              position: "relative",
              paddingRight: 12,
            }}
          >
            Segundo
            <span
              style={{
                position: "absolute",
                right: 0,
                top: 12,
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: colors.gold500,
              }}
            />
          </span>
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: colors.neutral500,
            }}
          >
            {tag}
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.neutral500 }}>
            maria@laferreteria.mx
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: colors.success,
            }}
          />
        </div>
      </div>

      {showTabs && (
        <div
          style={{
            display: "flex",
            gap: 28,
            padding: "0 22px",
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
          }}
        >
          {TABS.map((t) => {
            const active = t === activeTab;
            return (
              <div
                key={t}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "14px 2px",
                  color: active ? colors.neutral50 : colors.neutral500,
                  borderBottom: active
                    ? `2px solid ${colors.gold500}`
                    : "2px solid transparent",
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
};
