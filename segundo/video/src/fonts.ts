import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadDmSerif } from "@remotion/google-fonts/DMSerifDisplay";

export const loadFonts = () => {
  loadDmSans("normal", { weights: ["400", "500", "600", "700"] });
  loadDmSerif("normal", { weights: ["400"] });
};
