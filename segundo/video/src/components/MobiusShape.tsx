import { colors } from "../theme";

interface Props {
  size?: number;
  rotationSpeed?: number;
}

export const MobiusShape: React.FC<Props> = ({ size = 360 }) => {
  return (
    <div style={{ width: size, height: size, perspective: 1200 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(20deg) rotateY(35deg) rotateZ(-12deg)`,
        }}
      >
        <svg
          viewBox="-200 -200 400 400"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="mobiusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.gold200} />
              <stop offset="50%" stopColor={colors.gold500} />
              <stop offset="100%" stopColor={colors.gold700} />
            </linearGradient>
            <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <ellipse
            cx="0"
            cy="0"
            rx="140"
            ry="50"
            fill="none"
            stroke={colors.gold700}
            strokeWidth="22"
            opacity="0.55"
            transform="rotate(-25)"
            filter="url(#softShadow)"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="160"
            ry="60"
            fill="none"
            stroke="url(#mobiusGrad)"
            strokeWidth="28"
            transform="rotate(15)"
            strokeLinecap="round"
          />
          <ellipse
            cx="0"
            cy="-4"
            rx="160"
            ry="60"
            fill="none"
            stroke={colors.gold200}
            strokeWidth="3"
            opacity="0.7"
            transform="rotate(15)"
          />
          <path
            d="M -150 -30 Q 0 80 150 -30"
            fill="none"
            stroke={colors.gold600}
            strokeWidth="22"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </div>
    </div>
  );
};
