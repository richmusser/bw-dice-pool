import { shadeToTarget, shadeLabel } from './shadeUtils.js'
import { BwDicePool } from './BwDicePool.js'

const SOCKET_NAME = 'module.bw-dice-pool'

export class PoolPanel extends Application {

  numDice = 4
  ob = 3
  shade = 'B'

  shades = ['B', 'G', 'W']
  shadeIndex = 0
  usingPersona = false

  numPersona = 0
  personaMode = false


  constructor(mods, help) {
    super({
      template: "modules/bw-dice-pool/templates/poolPanel.hbs",
      popOut: false,
    });

    try {
      this.ob = game.settings.get('bw-dice-pool', 'obstacle')
    }
    catch (err) {
      console.error('Error getting obstacle setting: ' + err)
    }
  }

  activateListeners(html) {
    html.find('.dice-increase-button').on('click', () => {

      if(this.personaMode) {
        if(this.numPersona < 3){
          this.numPersona++
          this.render();  
        }
      }
      else {
        this.numDice++
        this.render();  
      }

    })

    html.find('.dice-decrease-button').on('click', () => {

      if(this.personaMode) {
        if(this.numPersona > 0) {
          this.numPersona--
        }
      }
      else {
        if (this.numDice > 1) {
          this.numDice--
        }
      }
      this.render();
    })

    html.find('.roll').on('click', async () => {
      await this.rollPool({ open: false });
    //  this.render();
    })

    html.find('.roll-open').on('click', async () => {
      await this.rollPool({ open: true });
    //  this.render();
    })

    html.find('.roll-dof').on('click', async () => {
      await this.rollDieOfFate();
    //  this.render();
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

    html.find('.btn-persona').on('click', () => {

      this.personaMode = !this.personaMode
      this.render()
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

    if (ob < 1) {
      ob = 1;
    }
    this.ob = ob

    this.render();
    this.sendObChangedEvent(this.ob)
    game.settings.set('bw-dice-pool', 'obstacle', ob)
  }

  sendObChangedEvent(ob) {
    game.socket.emit(SOCKET_NAME, { type: "obChanged", ob: ob })
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
    data.numPersona = this.numPersona
    data.personaMode = this.personaMode
    data.flushToBottom = true // only enable if macro bar is hidden, such as with Minimal UI module

    console.log("BW Dice Pool Data", data)

    return data;
  }

  cycleShade() {
    this.shadeIndex++;
    if (this.shadeIndex >= this.shades.length)
      this.shadeIndex = 0;
  }

  async rollPool({ open }) {

    let pool = new BwDicePool(this.getShade(), this.numDice + this.numPersona, open, this.ob, this.numPersona)
    await pool.roll()

    const chatData = {
      ...pool.data,
      allowFate: open || pool.data.sixes,
      allowDeeds: true,
      didDeeds: false,
      didFate: false,
    }

    chatData.json = JSON.stringify(chatData)

    let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
    await ChatMessage.create({
      content: message,
      speaker: ChatMessage.getSpeaker()
    });

    this.usingPersona = false;
    this.render();
  }

  async rollDieOfFate(){
    const roll = await new Roll(`1d6`).evaluate({ async: true });
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, null, false)
        .then(_ => roll);
    }

    let chatData = {
      value: roll.terms[0].results[0].result
    }

    let message = await renderTemplate("modules/bw-dice-pool/templates/chatDieOfFate.hbs", chatData);
    await ChatMessage.create({
      content: message,
      speaker: ChatMessage.getSpeaker()
    });

    return chat
  }


  findTestDifficulty(dice, ob) {

    if (ob > dice) {
      return 'Challenging'
    }
    else if (dice === 1) {
      return 'Routine/Difficult'
    }
    else if (dice <= 3) {
      if (ob === dice)
        return 'Difficult'
      else
        return 'Routine'
    }
    else if (dice <= 7) {
      if (dice - ob <= 1)
        return 'Difficult'
      else
        return 'Routine'
    }
    else {
      if (dice - ob <= 2)
        return 'Difficult'
      else
        return 'Routine'
    }
  }
}