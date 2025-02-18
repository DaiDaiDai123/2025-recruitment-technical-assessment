import express, { Request, Response } from "express";
import { get } from "http";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface  requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

interface summary {
  name: string;
  cookTime: number;
  requiredIngredients: requiredItem[];
}
// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: cookbookEntry[] = [];

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  // only allow alphanumeric characters and a single space between words
  let newRecipeName = recipeName.replace(/[-_]+/g, " ").trim();
  newRecipeName = newRecipeName.replace(/[^a-zA-Z\s]/g, "");
  newRecipeName = newRecipeName.replace(/\s+/g, " ");

  // only capitalize the first letter of each word
  newRecipeName = newRecipeName.toLowerCase();
  newRecipeName = newRecipeName.replace(/\b\w/g, char => char.toUpperCase());

  if (newRecipeName.length === 0) {
    return null;
  }

  return newRecipeName;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  const entry: cookbookEntry = req.body;

  if (!isValidCookbookEntry(entry)) {
    res.status(400).send("something is up with your recipe/ingredient");
    return;
  }

  cookbook.push(entry);
  res.status(200).send({});
});
/**
 * Checks if a given cookbook entry is legal.
 * 
 * @param entry - The cookbook entry to be validated.
 * @returns `true` if the entry is legal, `false` otherwise.
 */
function isValidCookbookEntry(entry: cookbookEntry): boolean {
  if (!entry || typeof entry.name !== "string") return false;

  // There are some seemingly redundant checks here, but they are necessary to ensure that the 
  // required properties are present and have the correct types. As in the auto test case for unique
  // names, one of the "Beef" has type recipe but its fields are those of an ingredient.
  // I am not sure if it's intentional or a mistake, so I added the check here.
  if (entry.type === "ingredient") {
    const { cookTime } = entry as ingredient;
    if (typeof cookTime !== "number" || cookTime < 0) return false;
  } else if (entry.type === "recipe") {
    const { requiredItems } = entry as recipe;
    
    if (!Array.isArray(requiredItems)) return false;
    
    const existingItems = new Set<string>();
    for (const { name, quantity } of requiredItems) {
      if (typeof name !== "string" || typeof quantity !== "number") return false;
      if (existingItems.has(name)) return false; // Check for duplicates
      existingItems.add(name);
    }
  } else {
    return false;
  }

  return !cookbook.some(existingEntry => existingEntry.name === entry.name);
}


// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req:Request, res:Request) => {
  const { name } = req.query;

  if (!checkIfRecipe(name)) {
    res.status(400).send("not a recipe");
    return;
  }

  let totalCookTime = 0;
  let requiredIngredients: requiredItem[] = [];

  let summary = {
    name: name,
    cookTime: totalCookTime,
    requiredIngredients: requiredIngredients,
  }

  if (!getSummary(name, summary)) {
    res.status(400).send("something is up with your recipe");
    return;
  }

  res.json(summary);
});

/**
 * Checks if a given name corresponds to a recipe in the cookbook.
 *
 * @param name - The name of the item to check.
 * @returns `true` if the item is a recipe, `false` otherwise.
 */
function checkIfRecipe(name: string): boolean {
  let recipe = cookbook.find(entry => entry.name === name);
  if (!recipe) {
    return false;
  }
  return recipe.type === "recipe";
}

/**
 * Recursively calculates the summary of required ingredients and total cook time for a given recipe.
 *
 * @param name - The name of the recipe to summarize.
 * @param summary - An object that accumulates the required ingredients and total cook time.
 * @returns A boolean indicating whether the summary was successfully generated.
 *
 */
function getSummary(name: string, summary: summary): boolean {
  let currentRecipe: recipe | null = cookbook.find(entry => entry.name === name) as recipe;
  if (!currentRecipe) {
    return false; // Exit immediately if the recipe is not found
  }

  for (const requiredItem of currentRecipe.requiredItems) {
    let currentItem = cookbook.find(entry => entry.name === requiredItem.name);
    if (!currentItem) {
      return false; // Stop the entire function immediately
    }

    if (currentItem.type === "recipe") {
      let result = getSummary(currentItem.name, summary);
      if (result === false) {
        return false; // Stop recursion immediately
      }
    } else {
      let existingEntry = summary.requiredIngredients.find(item => item.name === requiredItem.name);
      if (!existingEntry) {
        summary.requiredIngredients.push(requiredItem);
      } else {
        existingEntry.quantity += requiredItem.quantity;
      }
      summary.cookTime += (currentItem as ingredient).cookTime;
    }
  }
  return true;
}

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
