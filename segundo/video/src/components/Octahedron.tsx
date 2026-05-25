import { colors } from "../theme";

interface Props {
  size?: number;
  delay?: number;
  rotationSpeed?: number;
}

export const Octahedron: React.FC<Props> = ({ size = 140, delay = 0 }) => {
  return (
    <div style={{ width: size, height: size, perspective: 800 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(35deg) rotateY(25deg)`,
        }}
      >
        <svg viewBox="-100 -100 200 200" width="100%" height="100%">
          <defs>
            <linearGradient id={`octLight${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.gold200} />
              <stop offset="100%" stopColor={colors.gold500} />
            </linearGradient>
            <linearGradient id={`octDark${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.gold600} />
              <stop offset="100%" stopColor={colors.gold700} />
            </linearGradient>
          </defs>
          <polygon
            points="0,-80 70,0 0,0"
            fill={`url(#octLight${delay})`}
            stroke={colors.gold200}
            strokeWidth="0.8"
          />
          <polygon
            points="0,-80 -70,0 0,0"
            fill={colors.gold400}
            stroke={colors.gold200}
            strokeWidth="0.8"
          />
          <polygon
            points="0,80 70,0 0,0"
            fill={`url(#octDark${delay})`}
            stroke={colors.gold700}
            strokeWidth="0.8"
          />
          <polygon
            points="0,80 -70,0 0,0"
            fill={colors.gold700}
            stroke={colors.gold700}
            strokeWidth="0.8"
          />
        </svg>
      </div>
    </div>
  );
};
