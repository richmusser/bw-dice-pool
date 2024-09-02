import {shadeToTarget, shadeLabel} from './shadeUtils.js'
import {BwDicePool} from './BwDicePool.js'

const SOCKET_NAME ='module.bw-dice-pool'

export class PoolPanel extends Application {

  numDice = 4
  ob = 3
  shade = 'B'

  shades = ['B', 'G', 'W']
  shadeIndex = 0;

  constructor(mods, help) {
    super({
      template: "modules/bw-dice-pool/templates/poolPanel.hbs",
      popOut: false,
    });

    try {
      this.ob = game.settings.get('bw-dice-pool', 'obstacle')
    }
    catch(err) {
      console.error('Error getting obstacle setting: ' + err)
    }
  }

  activateListeners(html) {
    html.find('.dice-increase-button').on('click', () => {
      this.numDice++
      this.render();
    })

    html.find('.dice-decrease-button').on('click', () => {
      if (this.numDice > 1) {
        this.numDice--
      }
      //game.burningwheel.macros.rollSkill(0,0)
      this.render();
    })

    html.find('.roll').on('click', async () => {
      await this.rollPool({ open: false });
      this.render();
    })

    html.find('.roll-open').on('click', async () => {
      await this.rollPool({ open: true });
      this.render();
    })

    html.find('.btn-shade').on('click', (elem) => {
      this.cycleShade();
      this.render();
      // console.log('shade click', elem.currentTarget)
      // $(elem.currentTarget).addClass('active')
    })

    html.find('.btn-ob-increase').on('click', () => {
      this.changeOb(this.ob + 1);
    })

    html.find('.btn-ob-decrease').on('click', () => {
      this.changeOb(this.ob - 1);
      })
  }

  socketListen() {
    game.socket.on(SOCKET_NAME, ({ type, ob }) => {
      console.log("ON SOCKET", type, ob)
        if (type === "obChanged") {
            this.ob = ob;
            this.render(true);
        }
      });
  }

  changeOb(ob) {
   
    if(ob < 1) {
      ob = 1;
    }
    this.ob = ob

    this.render();
    this.sendObChangedEvent(this.ob)
    game.settings.set('bw-dice-pool', 'obstacle', ob)
  }

  sendObChangedEvent(ob) {
    game.socket.emit(SOCKET_NAME, {type: "obChanged", ob: ob} )
  }

  getShade() {
    return this.shades[this.shadeIndex]
  }

  getData() {
    const data = super.getData();
    data.numDice = this.numDice;

    data.renderDice = data.numDice < 10
    data.ob = this.ob
    data.shade = shadeLabel(this.getShade())
    data.isGm = game.user.isGM

    console.log("DATA", data)

    return data;
  }

  cycleShade() {
    this.shadeIndex++;
    if(this.shadeIndex >= this.shades.length)
      this.shadeIndex = 0;
  }



  async rollPool({ open }) {

    let pool = new BwDicePool(this.getShade(), this.numDice, open, this.ob)
    await pool.roll()


  //  let roll = await this.rollDice(this.numDice, open, shadeToTarget(this.shade))
   // let evalData = this.evaluateRoll(this.numDice, roll, this.ob)
    //let evalData = pool.data
    await this.sendRollToChat(pool.data)
  }

  // async rollPoolOpen() {

  // }

  // async rollDice(numDice, isOpen, target) {
  //   console.log(`rolling! ${numDice} dice`)
  //   const roll = await new Roll(`${numDice}d6${isOpen ? 'x6' : ''}cs>${target}`).evaluate({ async: true });
  //   if (game.dice3d) {
  //     return game.dice3d.showForRoll(roll, game.user, true, null, false)
  //       .then(_ => roll);
  //   }

  //   return roll
  // }

  // evaluateRoll(numRolled, roll, ob) {
  //   console.log("roll terms", roll.terms);
  //   const successes = roll.terms[0].results.filter((r) => r.success)
  //   const sixes = roll.terms[0].results.filter((r) => r.result == 6)
  //   const passedTest = successes.length >= ob
  //   const totalDice = numRolled//roll.terms[0].number
  //   let data = {
  //     ob,
  //     passedTest,
  //     totalDice,
  //     sixes: sixes.length,
  //     successCount: successes.length,
  //     rollResults: roll.terms[0].results, // success, result
  //     difficulty: this.findTestDifficulty(totalDice, ob),
  //     shade: shadeLabel(this.shade),      
  //   }

  //   data.json = JSON.stringify(data)

  //   return data;
  // }

  async sendRollToChat(chatData) {
    let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
    let chat =  await ChatMessage.create({
      content: message,
      // speaker: ChatMessage.getSpeaker({ actor })
    });

    return chat
  }

  findTestDifficulty(dice, ob) {

    if(ob > dice) {
      return 'Challenging'
    }
    else if(dice === 1) {
      return 'Routine/Difficult'
    }
    else if(dice <= 3) {
      if(ob === dice) 
        return 'Difficult'
      else 
        return  'Routine'
    }
    else if(dice <= 7) {
      if( dice - ob <= 1) 
        return 'Difficult'
      else 
        return 'Routine'
    }
    else {
      if( dice - ob <= 2) 
        return 'Difficult'
      else
      return 'Routine'
    }

  }
}