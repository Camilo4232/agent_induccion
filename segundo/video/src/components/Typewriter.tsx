import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
  cursor?: boolean;
}

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame,
  charsPerFrame = 0.9,
  style,
  cursor = true,
}) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - startFrame);
  const shown = Math.min(text.length, Math.floor(local * charsPerFrame));
  const visible = text.slice(0, shown);
  const blink = Math.floor(frame / 12) % 2 === 0;
  const showCursor = cursor && shown < text.length;
  const blinkCursor = cursor && shown >= text.length && blink;

  return (
    <span style={style}>
      {visible}
      {(showCursor || blinkCursor) && (
        <span style={{ opacity: showCursor ? 1 : 0.6 }}>▍</span>
      )}
    </span>
  );
};
