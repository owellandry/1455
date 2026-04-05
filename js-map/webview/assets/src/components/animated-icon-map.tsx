import type { Data } from "@lottiefiles/dotlottie-react";

import ClockIcon from "@/icons/clock.svg";
import CodexIcon from "@/icons/codex.svg";
import GlobeIcon from "@/icons/globe.svg";
import HomepageLogoIcon from "@/icons/homepage-logo.svg";
import ImageSquareIcon from "@/icons/image-square.svg";
import InternalKnowledgeIcon from "@/icons/internal-knowledge.svg";
import SearchIcon from "@/icons/search.svg";
import TasksIcon from "@/icons/tasks.svg";
import TerminalIcon from "@/icons/terminal.svg";

export type AnimationType =
  | "analyze-image"
  | "automation"
  | "browsing"
  | "code-searching"
  | "codex-happy-small"
  | "codex-looking-around"
  | "edit-files"
  | "hello"
  | "loader"
  | "internal-knowledge"
  | "list-files"
  | "local-context"
  | "run-command"
  | "searching"
  | "to-do"
  | "web-search";

export const LottieAnimationMap: Record<AnimationType, () => Promise<Data>> = {
  "analyze-image": () =>
    import("@/lotties/analyze_image_animation.json").then(
      (module) => module.default,
    ),
  automation: () =>
    import("@/lotties/automation.json").then((module) => module.default),
  browsing: () =>
    import("@/lotties/browsing_animation.json").then(
      (module) => module.default,
    ),
  "code-searching": () =>
    import("@/lotties/code-searching-icon.json").then(
      (module) => module.default,
    ),
  "codex-happy-small": () =>
    import("@/lotties/codex-happy-small.json").then((module) => module.default),
  "codex-looking-around": () =>
    import("@/lotties/codex-looking-around.json").then(
      (module) => module.default,
    ),
  "edit-files": () =>
    import("@/lotties/edit_files_animation.json").then(
      (module) => module.default,
    ),
  hello: () => import("@/lotties/hello.json").then((module) => module.default),
  loader: () =>
    import("@/lotties/loader.json").then((module) => module.default),
  "internal-knowledge": () =>
    import("@/lotties/internal-knowledge-icon.json").then(
      (module) => module.default,
    ),
  "list-files": () =>
    import("@/lotties/list_files_animation.json").then(
      (module) => module.default,
    ),
  "local-context": () =>
    import("@/lotties/local_context_animation.json").then(
      (module) => module.default,
    ),
  "run-command": () =>
    import("@/lotties/run_command_animation.json").then(
      (module) => module.default,
    ),
  searching: () =>
    import("@/lotties/searching_animation.json").then(
      (module) => module.default,
    ),
  "to-do": () =>
    import("@/lotties/to_do_animation.json").then((module) => module.default),
  "web-search": () =>
    import("@/lotties/web-search-icon.json").then((module) => module.default),
};

export const LottieSvgFallbacks: Record<
  AnimationType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  "analyze-image": ImageSquareIcon,
  automation: ClockIcon,
  browsing: GlobeIcon,
  "code-searching": TerminalIcon,
  "codex-happy-small": CodexIcon,
  "codex-looking-around": CodexIcon,
  "edit-files": TerminalIcon,
  hello: HomepageLogoIcon,
  loader: CodexIcon,
  "internal-knowledge": InternalKnowledgeIcon,
  "list-files": TerminalIcon,
  "local-context": SearchIcon,
  "run-command": TerminalIcon,
  searching: SearchIcon,
  "to-do": TasksIcon,
  "web-search": GlobeIcon,
};

export type AnimationDefinition = {
  animationJson: Promise<Data> | null;
  SvgFallback: React.ComponentType<React.SVGProps<SVGSVGElement>> | null;
};

export function getLottieAnimationDefinition({
  animation,
  animationData,
  fallback,
}: {
  animation?: AnimationType | null;
  animationData?: Data | null;
  fallback?: AnimationDefinition["SvgFallback"];
}): AnimationDefinition {
  const output: AnimationDefinition = {
    animationJson: animationData ? Promise.resolve(animationData) : null,
    SvgFallback: fallback || null,
  };

  if (animation) {
    output.animationJson = LottieAnimationMap[animation]();
    output.SvgFallback = LottieSvgFallbacks[animation];
  }

  return output;
}
