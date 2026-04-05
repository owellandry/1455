import type {
  AboveComposerSuggestion,
  AboveComposerSuggestionMatchContext,
} from "./above-composer-suggestions-types";
import { buildPlanKeywordSuggestion } from "./suggestions/plan-keyword-suggestion";
import { buildRecommendedPluginKeywordSuggestion } from "./suggestions/recommended-plugin-keyword-suggestion";

const ABOVE_COMPOSER_SUGGESTION_PRODUCERS = [
  buildRecommendedPluginKeywordSuggestion,
  buildPlanKeywordSuggestion,
];

export function selectFirstAboveComposerSuggestion(
  context: AboveComposerSuggestionMatchContext,
): AboveComposerSuggestion | null {
  for (const producer of ABOVE_COMPOSER_SUGGESTION_PRODUCERS) {
    const suggestion = producer(context);
    if (suggestion != null) {
      return suggestion;
    }
  }

  return null;
}
