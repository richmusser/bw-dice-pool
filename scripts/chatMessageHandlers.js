import {BwDicePool} from './BwDicePool.js'


export async function fateReroll(target) {
    console.log(target)
    console.log(target.dataset)

    let originalRollData = JSON.parse(target.dataset.json)


    console.log("Fate reroll clicked")

    //if the roll was already open ended, simply rewroll one traitor

    let shade = originalRollData.shade
    let numDice = originalRollData.sixes


    let fateRoll = await rollFate(shade, numDice);

    let fateRerollData = {
        ...originalRollData
    }

    let successCount = originalRollData.successCount + fateRoll.data.successCount
    fateRerollData.passedTest = successCount >= originalRollData.ob
    fateRerollData.successCount = successCount
    fateRerollData.rollResults.push(...fateRoll.data.rollResults)

    await sendRollToChat(fateRerollData)


    // const roll = await new Roll(`${numDice}d6${isOpen ? 'x6' : ''}cs>${target}`).evaluate({ async: true });
    // if (game.dice3d) {
    //   return game.dice3d.showForRoll(roll, game.user, true, null, false)
    //     .then(_ => roll);
    // }


}

async function rollFate(shade, numDice) {

    let pool = new BwDicePool(shade, numDice, true, 1)
    await pool.roll()

    return pool

    // const roll = await new Roll(`${diceReroll}d6csx6>${3}`).evaluate({ async: true });
    // if (game.dice3d) {
    //   return game.dice3d.showForRoll(roll, game.user, true, null, false)
    //     .then(_ => roll);
    // }
    // return roll
}


async function sendRollToChat(chatData) {
    let message = await renderTemplate("modules/bw-dice-pool/templates/chatFateRerollTemplate.hbs", chatData);
    let chat =  await ChatMessage.create({
      content: message,
      // speaker: ChatMessage.getSpeaker({ actor })
    });

    return chat
  }