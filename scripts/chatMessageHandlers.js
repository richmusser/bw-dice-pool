import { BwDicePool } from './BwDicePool.js'
import { getActor } from './getActor.js'

/**
 * Chat handler for rerolling with Fate (Luck)
 * @param {*} target html element that was clicked, must have a data attribute named 'json'
 */
export async function fateReroll(target) {
	// console.log(target)
	// console.log(target.dataset)

	let originalRollData = JSON.parse(target.dataset.json)

	let shade = originalRollData.shade

	//if the roll was already open ended, simply reroll one traitor
	let numDice = originalRollData.isOpen ? 1 : originalRollData.sixes

	let pool = new BwDicePool(shade, numDice, true, 1, originalRollData.numPersona)
	await pool.roll()

	let rerollData = {
		...originalRollData
	}

	let successCount = originalRollData.successCount + pool.data.successCount
	rerollData.passedTest = successCount >= originalRollData.ob
	rerollData.successCount = successCount
	rerollData.rollResults.push(...pool.data.rollResults)
	rerollData.rerollLabel = 'Fate Roll: '
	rerollData.allowFate = false;
	rerollData.allowDeeds = !originalRollData.didDeeds;
	rerollData.didFate = true;
	rerollData.numPersona = originalRollData.numPersona;

	rerollData.json = JSON.stringify(rerollData)

	await sendRollToChat(rerollData)
}


/**
 * Chat handler for rerolling with Deeds (Saving Grace)
 * @param {*} target html element that was clicked, must have a data attribute named 'json'
 */
export async function deedsReroll(target) {
	// console.log(target)
	// console.log(target.dataset)

	let originalRollData = JSON.parse(target.dataset.json)

	let shade = originalRollData.shade

	let numDice = originalRollData.totalDice - originalRollData.successCount

	let pool = new BwDicePool(shade, numDice, originalRollData.isOpen, 1, originalRollData.numPersona)
	await pool.roll()

	let rerollData = {
		...originalRollData
	}

	let successCount = originalRollData.successCount + pool.data.successCount

	rerollData.sixes = originalRollData.sixes + pool.data.sixes
	rerollData.passedTest = successCount >= originalRollData.ob
	rerollData.successCount = successCount
	rerollData.rollResults.push(...pool.data.rollResults)
	rerollData.rerollLabel = 'Deeds Roll: '
	rerollData.allowFate = !originalRollData.didFate && (rerollData.sixes || originalRollData.isOpen);
	rerollData.allowDeeds = false;
	rerollData.didDeeds = true;
	rerollData.numPersona = originalRollData.numPersona;

	rerollData.json = JSON.stringify(rerollData)

	await sendRollToChat(rerollData)
}

async function sendRollToChat(chatData) {
	let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
	let chat = await ChatMessage.create({
		content: message,
		speaker: ChatMessage.getSpeaker()
	});

	return chat
}

export async function awardTest(target) {
  // console.log("Award Test clicked", target);
  let originalRollData = JSON.parse(target.dataset.json);

  console.log("Original Roll Data:", originalRollData);

  // Get the actor from the controlled token
  let actor = getActor();
  
  if(!actor)  {
	ui.notifications.warn("No controlled token found. Please select a token to award a test.");
	return;
  }

  console.log("Actor skills:", actor.system.skills);

  if(!actor.system[originalRollData.abilityType]) 
	return;

  if(originalRollData.abilityType === 'armor') 
	return;

  let abilities = actor.system[originalRollData.abilityType];

  let ability = null;

  if(originalRollData.abilityType === 'skills') {
	// Find the skill by name
	let skill = Object.keys(abilities).map( aKey => abilities[aKey]).find(s => s.name.trim() === originalRollData.abilityName);
	if(skill) {
	  ability = skill;
    }	
  }
  else {
	ability = abilities[originalRollData.abilityName]
  }

  let difficultyData = null;

  if(ability) {
	switch(originalRollData.difficulty) {
		case 'Routine':
			difficultyData = ability.routine;		
		break;
		case 'Difficult':
			difficultyData = ability.difficult;
		break;
		case 'Challenging':		
			difficultyData = ability.challenge;
		break;
	}

  	if(!difficultyData) {
		ui.notifications.warn(`Routine tests do not progress ${originalRollData.abilityLabel}.`);
		return;
	}

	if( originalRollData.abilityName === 'perception' && !originalRollData.passedTest) {
		ui.notifications.warn(`Only successful perception tests can be awarded progress.`);
		return;
	}

	let didAward = false;

	for(let key in Object.keys(difficultyData)) {
		let value = difficultyData[key];

		if(value === false) {
			difficultyData[key] = true;
			didAward = true;
			break;
		}
	}

	if(didAward) {
		ui.notifications.info(`Awarding ${originalRollData.difficulty} test for ${originalRollData.abilityLabel}.`);
	}
	else {
		ui.notifications.warn(`No progress awarded for ${originalRollData.abilityLabel}.`);
	}	
 
  }
}