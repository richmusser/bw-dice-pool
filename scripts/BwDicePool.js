import { shadeToTarget, shadeLabel } from './shadeUtils.js'

export class BwDicePool {

  shade = 'B'
  numDice = 1;
  isOpen = false;
  ob = 1;

  data = {}

  constructor(shade, numDice, isOpen, ob) {
    this.numDice = numDice;
    this.isOpen = isOpen;
    this.ob = ob;
    this.shade = shade;
  }


  async roll() {
    let roll = await this.rollDice();
    this.data = this.evaluateRoll(this.numDice, roll);
  }


  async rollDice() {
    const target = shadeToTarget(this.shade)
    console.log(`rolling! ${this.numDice} dice`)
    const roll = await new Roll(`${this.numDice}d6${this.isOpen ? 'x6' : ''}cs>${target}`).evaluate({ async: true });
    if (game.dice3d) {
      return game.dice3d.showForRoll(roll, game.user, true, null, false)
        .then(_ => roll);
    }

    return roll
  }

  evaluateRoll(numRolled, roll) {
    console.log("roll terms", roll.terms);
    const successes = roll.terms[0].results.filter((r) => r.success)
    const sixes = roll.terms[0].results.filter((r) => r.result == 6)
    const passedTest = successes.length >= this.ob
    const totalDice = numRolled//roll.terms[0].number

    let data = {
      ob: this.ob,
      passedTest,
      totalDice,
      sixes: sixes.length,
      successCount: successes.length,
      rollResults: roll.terms[0].results, // {success, result}
      difficulty: this.findTestDifficulty(totalDice),
      shadeLabel: shadeLabel(this.shade),
      shade: this.shade,
      isOpen: this.isOpen
    }

    return data;
  }

  findTestDifficulty(dice) {

    if (this.ob > dice) {
      return 'Challenging'
    }
    else if (dice === 1) {
      return 'Routine/Difficult'
    }
    else if (dice <= 3) {
      if (this.ob === dice)
        return 'Difficult'
      else
        return 'Routine'
    }
    else if (dice <= 7) {
      if (dice - this.ob <= 1)
        return 'Difficult'
      else
        return 'Routine'
    }
    else {
      if (dice - this.ob <= 2)
        return 'Difficult'
      else
        return 'Routine'
    }

  }
}