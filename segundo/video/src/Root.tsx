import { Composition } from "remotion";
import { PitchVideo } from "./PitchVideo";
import { FPS, HEIGHT, TOTAL_DURATION, WIDTH } from "./theme";
import { loadFonts } from "./fonts";

loadFonts();

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PitchVideo"
        component={PitchVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
