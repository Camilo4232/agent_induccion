import { AbsoluteFill } from "remotion";
import { ReactNode } from "react";
import { BackgroundGrain } from "./BackgroundGrain";
import { colors, fonts } from "../theme";

interface Props {
  children: ReactNode;
  label?: string;
}

export const SceneFrame: React.FC<Props> = ({ children, label }) => {
  return (
    <AbsoluteFill>
      <BackgroundGrain />
      <AbsoluteFill
        style={{
          padding: "120px 160px",
          fontFamily: fonts.sans,
          color: colors.neutral100,
        }}
      >
        {children}
      </AbsoluteFill>
      {label && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 160,
            fontFamily: fonts.sans,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: colors.gold500,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 160,
          fontFamily: fonts.sans,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: colors.neutral500,
        }}
      >
        Segundo
      </div>
    </AbsoluteFill>
  );
};
