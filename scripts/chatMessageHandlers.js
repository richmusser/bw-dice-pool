import { BwDicePool } from './BwDicePool.js'

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

	let pool = new BwDicePool(shade, numDice, true, 1)
	await pool.roll()

	let rerollData = {
		...originalRollData
	}

	let successCount = originalRollData.successCount + pool.data.successCount
	rerollData.passedTest = successCount >= originalRollData.ob
	rerollData.successCount = successCount
	rerollData.rollResults.push(...pool.data.rollResults)
	rerollData.rerollLabel = 'Fate Reroll: '
	rerollData.allowFate = false;
	rerollData.allowDeeds = !originalRollData.didDeeds;
	rerollData.didFate = true;

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

	let pool = new BwDicePool(shade, numDice, originalRollData.isOpen, 1)
	await pool.roll()

	let rerollData = {
		...originalRollData
	}

	let successCount = originalRollData.successCount + pool.data.successCount

	rerollData.sixes = originalRollData.sixes + pool.data.sixes
	rerollData.passedTest = successCount >= originalRollData.ob
	rerollData.successCount = successCount
	rerollData.rollResults.push(...pool.data.rollResults)
	rerollData.rerollLabel = 'Deeds Reroll: '
	rerollData.allowFate = !originalRollData.didFate && (rerollData.sixes || originalRollData.isOpen);
	rerollData.allowDeeds = false;
	rerollData.didDeeds = true;

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