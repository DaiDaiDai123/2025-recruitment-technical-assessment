from dataclasses import dataclass
from typing import List, Dict, Union
from flask import Flask, request, jsonify
import re

# ==== Type Definitions, feel free to add or modify ===========================
@dataclass
class CookbookEntry:
	name: str

@dataclass
class RequiredItem():
	name: str
	quantity: int

@dataclass
class Recipe(CookbookEntry):
	required_items: List[RequiredItem]

@dataclass
class Ingredient(CookbookEntry):
	cook_time: int


# =============================================================================
# ==== HTTP Endpoint Stubs ====================================================
# =============================================================================
app = Flask(__name__)

# Store your recipes here!
cookbook = []

# Task 1 helper (don't touch)
@app.route("/parse", methods=['POST'])
def parse():
	data = request.get_json()
	recipe_name = data.get('input', '')
	parsed_name = parse_handwriting(recipe_name)
	if parsed_name is None:
		return 'Invalid recipe name', 400
	return jsonify({'msg': parsed_name}), 200

# [TASK 1] ====================================================================
# Takes in a recipeName and returns it in a form that 
def parse_handwriting(recipeName: str) -> Union[str | None]:
	# TODO: implement me
	recipeName = re.sub(r'[-_]+', ' ', recipeName).strip()
	recipeName = re.sub(r'[^a-zA-Z\s]', '', recipeName)
	recipeName = re.sub(r'\s+', ' ', recipeName)

	recipeName = recipeName.lower()
	recipeName = recipeName.title()

	if len(recipeName) == 0:
		return None
	
	return recipeName


# [TASK 2] ====================================================================
# Endpoint that adds a CookbookEntry to your magical cookbook
@app.route('/entry', methods=['POST'])
def create_entry():
	entry = request.get_json()
	if not is_valid_entry(entry, cookbook):
		return jsonify({'msg': 'Invalid entry'}), 400
	
	cookbook.append(entry)
	return {}, 200

def is_valid_entry(entry, cookbook):
	"""
	Validates an entry for a cookbook.
	Args:
		entry (dict): The entry to validate. It should have at least a 'name' (str) and a 'type' (str).
					  If 'type' is 'ingredient', it should also have a 'cookTime' (int or float, non-negative).
					  If 'type' is 'recipe', it should also have 'requiredItems' (list of dicts with 'name' (str) and 'quantity' (int)).
		cookbook (list): The list of existing entries in the cookbook. Each entry should be a dict with at least a 'name' (str).
	Returns:
		bool: True if the entry is valid and not a duplicate in the cookbook, False otherwise.
	"""
    if not entry or not isinstance(entry.get('name'), str):
        return False
	'''
	There are some seemingly redundant checks here, but they are necessary to ensure that the 
    required properties are present and have the correct types. As in the auto test case for unique
    names, one of the "Beef" has type recipe but its fields are those of an ingredient.
    I am not sure if it's intentional or a mistake, so I added the check here.
	'''
    if entry.get('type') == 'ingredient':
        cook_time = entry.get('cookTime')
        if not isinstance(cook_time, (int, float)) or cook_time < 0:
            return False
    elif entry.get('type') == 'recipe':
        required_items = entry.get('requiredItems')
        
        if not isinstance(required_items, list):
            return False
        
        existing_items = set()
        for item in required_items:
            name = item.get('name')
            quantity = item.get('quantity')
            if not isinstance(name, str) or not isinstance(quantity, int):
                return False
            if name in existing_items:
                return False
            existing_items.add(name)
    else:
        return False

    return not any(existing_entry['name'] == entry['name'] for existing_entry in cookbook)

# [TASK 3] ====================================================================
# Endpoint that returns a summary of a recipe that corresponds to a query name
@app.route('/summary', methods=['GET'])
def summary():
	name = request.args.get('name')
	if not check_if_recipe(name):
		return 'Recipe not found', 400
	
	summary = {'name': name,  'cookTime': 0, 'requiredIngredients': []}

	if not get_summary(name, summary):
		return 'Invalid recipe', 400
	
	return jsonify(summary), 200

def check_if_recipe(name: str) -> bool:
	"""
	Check if a given name corresponds to a recipe in the cookbook.

	Args:
		name (str): The name of the recipe to check.

	Returns:
		bool: True if the name corresponds to a recipe, False otherwise.
	"""
	return any(entry['name'] == name and entry['type'] == 'recipe' for entry in cookbook)

def get_summary(name: str, summary: dict) -> bool:
	"""
	Recursively generates a summary of required ingredients and total cook time for a given recipe.
	Args:
		name (str): The name of the recipe to summarize.
		summary (dict): A dictionary to store the summary of required ingredients and total cook time.
						It should have the keys 'requiredIngredients' (a list) and 'cookTime' (an int).
	Returns:
		bool: True if the summary was successfully generated, False if any required recipe or ingredient is missing.
	"""
    current_recipe = next((entry for entry in cookbook if entry['name'] == name), None)
    if not current_recipe:
        return Falsend

    for required_item in current_recipe['requiredItems']:
        current_item = next((entry for entry in cookbook if entry['name'] == required_item['name']), None)
        if not current_item:
            return False

        if current_item['type'] == 'recipe':
            result = get_summary(current_item['name'], summary)
            if not result:
                return False
        else:
            existing_entry = next((item for item in summary['requiredIngredients'] 
			if item['name'] == required_item['name']), None)
			
            if not existing_entry:
                summary['requiredIngredients'].append(required_item)
            else:
                existing_entry['quantity'] += required_item['quantity']
            summary['cookTime'] += current_item['cookTime']
    
    return True
# =============================================================================
# ==== DO NOT TOUCH ===========================================================
# =============================================================================

if __name__ == '__main__':
	app.run(debug=True, port=8080)
