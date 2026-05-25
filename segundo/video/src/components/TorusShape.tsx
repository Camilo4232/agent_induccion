import { colors } from "../theme";

interface Props {
  size?: number;
  rotationSpeed?: number;
}

export const TorusShape: React.FC<Props> = ({ size = 320 }) => {
  return (
    <div style={{ width: size, height: size, perspective: 1400 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(25deg) rotateY(20deg)`,
        }}
      >
        <svg viewBox="-200 -200 400 400" width="100%" height="100%">
          <defs>
            <radialGradient id="torusOuter" cx="50%" cy="35%" r="60%">
              <stop offset="0%" stopColor={colors.gold200} />
              <stop offset="60%" stopColor={colors.gold500} />
              <stop offset="100%" stopColor={colors.gold700} />
            </radialGradient>
            <radialGradient id="torusInner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.neutral800} />
              <stop offset="100%" stopColor={colors.neutral900} />
            </radialGradient>
          </defs>
          <ellipse cx="0" cy="0" rx="170" ry="60" fill="url(#torusOuter)" />
          <ellipse cx="0" cy="0" rx="80" ry="22" fill="url(#torusInner)" />
          <ellipse
            cx="0"
            cy="-32"
            rx="140"
            ry="14"
            fill={colors.gold200}
            opacity="0.4"
          />
          <ellipse
            cx="0"
            cy="32"
            rx="155"
            ry="18"
            fill={colors.neutral900}
            opacity="0.45"
          />
        </svg>
      </div>
    </div>
  );
};
