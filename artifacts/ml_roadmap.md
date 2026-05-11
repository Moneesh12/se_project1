# 🥗 Machine Learning Roadmap: Healthy Recipe Substitution

This document outlines the strategic integration of Machine Learning and AI to transform the project from a rule-based system into an intelligent, context-aware nutritional assistant.

## 1. Core ML Objectives
- **Automated Recipe Parsing:** Extract ingredients, quantities, and units from unstructured text.
- **Intelligent Substitution:** Suggest context-aware alternatives (e.g., baking vs. frying).
- **Disease-Specific Filtering:** Automatically flag ingredients restricted by medical conditions.
- **Personalized Recommendations:** Learn from user feedback (ratings) to improve suggestions over time.

---

## 2. Recommended Models & Architectures

### A. Named Entity Recognition (NER)
*   **Purpose:** Converting "2 cups of whole milk" into `{ name: "milk", quantity: 2, unit: "cup", type: "whole" }`.
*   **Model:** `bert-base-cased` fine-tuned on the **TASTEset** dataset.
*   **Tooling:** Use the `ingredient-parser-nlp` Python library for a production-ready solution.

### B. Ingredient Similarity (Embeddings)
*   **Purpose:** Finding ingredients that share similar culinary properties.
*   **Model:** **ingredient2Vec** (Skip-gram model trained on Recipe1M+).
*   **Logic:** Compute cosine similarity between ingredient vectors to find alternatives that the database might miss.

### C. Contextual Substitution (LLMs)
*   **Purpose:** Explaining *why* a substitute is recommended and handling complex edge cases.
*   **Model:** **Gemini 1.5 Pro / Flash** with Structured JSON Output.
*   **Prompting Strategy:** 
    ```json
    "system": "You are a clinical nutritionist. Replace ingredients for a {disease} patient. Suggest alternatives with {benefit}."
    ```

---

## 3. High-Impact Datasets

| Dataset | Description | Primary Use Case |
| :--- | :--- | :--- |
| **Recipe1MSubs** | 1M+ recipes with curated substitution pairs. | Training substitution models. |
| **USDA FoodData Central** | Federal database of nutritional values. | Verification and Health Scoring. |
| **FoodKG** | Knowledge graph connecting food, chemical compounds, and health. | Disease-ingredient relationship mapping. |
| **FlavorDB** | Molecular flavor profiles for 25,000+ ingredients. | Finding taste-alike substitutes. |

---

## 4. Implementation Phases

### Phase 1: AI-Powered Analysis (Current Priority)
- Replace `parseIngredients` regex in `recipe.ts` with a Gemini API call.
- Implement "Substitute Reasoning" where the AI explains the health benefits of the swap.

### Phase 2: Vector Search & Discovery
- Generate embeddings for all ingredients in `ingredientsTable`.
- Implement a "Search by Similarity" feature for users to find alternative ingredients.

### Phase 3: Feedback Loop (Reinforcement Learning)
- Use data from `feedbackTable` (ratings) to re-rank substitutes.
- If users consistently rate "Almond Milk" poorly for a specific recipe, the AI learns to stop suggesting it for that context.

---

> [!TIP]
> **Quick Win:** Start by integrating **Gemini 1.5 Flash** for the `POST /analyze-recipe` endpoint. It can handle both NER and Substitution logic in a single pass, drastically reducing code complexity.
