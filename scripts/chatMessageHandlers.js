
export async function fateReroll(target) {
    console.log(target)
    console.log(target.dataset)
    console.log("sixes", parseInt(target.dataset.sixes, 10))

    const sixes = parseInt(target.dataset.sixes, 10)

    console.log("Fate reroll clicked")

    //if the roll was already open ended, simply rewroll one traitor

    const roll = await new Roll(`${sixes}d6csx6>${3}`).evaluate({ async: true });
    if (game.dice3d) {
      return game.dice3d.showForRoll(roll, game.user, true, null, false)
        .then(_ => roll);
    }


    // const roll = await new Roll(`${numDice}d6${isOpen ? 'x6' : ''}cs>${target}`).evaluate({ async: true });
    // if (game.dice3d) {
    //   return game.dice3d.showForRoll(roll, game.user, true, null, false)
    //     .then(_ => roll);
    // }


}