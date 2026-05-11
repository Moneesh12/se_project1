/** VitalSub API – General-purpose ingredient substitution engine. */

export interface AnalyzeRecipeRequest {
  /** Comma-separated ingredient list, e.g. "2 cups brown sugar, 1 cup milk" */
  recipe: string;
}
