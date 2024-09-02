import { BwDicePool } from './BwDicePool.js'

export async function fateReroll(target) {
	console.log(target)
	console.log(target.dataset)

	let originalRollData = JSON.parse(target.dataset.json)

	let shade = originalRollData.shade

	//if the roll was already open ended, simply reroll one traitor
	let numDice = originalRollData.isOpen ? 1 : originalRollData.sixes

	let fateRoll = await rollFate(shade, numDice);

	let fateRerollData = {
		...originalRollData
	}

	let successCount = originalRollData.successCount + fateRoll.data.successCount
	fateRerollData.passedTest = successCount >= originalRollData.ob
	fateRerollData.successCount = successCount
	fateRerollData.rollResults.push(...fateRoll.data.rollResults)
	fateRerollData.rerollLabel = 'Fate Reroll: '
	fateRerollData.allowFate = false;
	fateRerollData.allowDeeds = true;

	await sendRollToChat(fateRerollData)
}

async function rollFate(shade, numDice) {

	let pool = new BwDicePool(shade, numDice, true, 1)
	await pool.roll()
	return pool
}

async function sendRollToChat(chatData) {
	let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
	let chat = await ChatMessage.create({
		content: message,
		// speaker: ChatMessage.getSpeaker({ actor })
	});

	return chat
}