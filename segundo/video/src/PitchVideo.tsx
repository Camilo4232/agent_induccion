import { AbsoluteFill, Sequence } from "remotion";
import { SCENES, colors } from "./theme";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { HowItWorksScene } from "./scenes/HowItWorksScene";
import { ValueScene } from "./scenes/ValueScene";
import { ClosingScene } from "./scenes/ClosingScene";

export const PitchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Sequence
        from={SCENES.hook.start}
        durationInFrames={SCENES.hook.duration}
        name="01 — Hook"
      >
        <HookScene />
      </Sequence>

      <Sequence
        from={SCENES.problem.start}
        durationInFrames={SCENES.problem.duration}
        name="02 — Problema"
      >
        <ProblemScene />
      </Sequence>

      <Sequence
        from={SCENES.solution.start}
        durationInFrames={SCENES.solution.duration}
        name="03 — El dueño enseña"
      >
        <SolutionScene />
      </Sequence>

      <Sequence
        from={SCENES.howItWorks.start}
        durationInFrames={SCENES.howItWorks.duration}
        name="04 — El empleado pregunta"
      >
        <HowItWorksScene />
      </Sequence>

      <Sequence
        from={SCENES.value.start}
        durationInFrames={SCENES.value.duration}
        name="05 — Valor"
      >
        <ValueScene />
      </Sequence>

      <Sequence
        from={SCENES.closing.start}
        durationInFrames={SCENES.closing.duration}
        name="06 — Cierre"
      >
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
