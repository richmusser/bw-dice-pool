export class PoolPanel extends Application {

    numDice = 4

   

    constructor(mods, help) {
        super({
            template: "modules/bw-dice-pool/templates/poolPanel.hbs",
            popOut: false,
        });
        console.log("PoolPanel ctor")
        this.mods = mods || [];
        this.help = help || [];

        console.log("gamelburninghweel", game.burningwheel)
    }

    activateListeners(html) {
        html.find('.dice-increase-button').on('click', () => {
            this.numDice++
            this.render();
        })

        html.find('.dice-decrease-button').on('click', () => {
            if( this.numDice > 0) {
                this.numDice--
            }
            //game.burningwheel.macros.rollSkill(0,0)
            this.render();
        })

        html.find('.roll').on('click', async () => {
            await this.rollPool({open: false});          
            this.render();
        })

        html.find('.roll-open').on('click', async () => {
            await this.rollPool({open:true});          
            this.render();
        })
    }

    getData() {
        const data = super.getData();
        data.numDice = this.numDice;
        return data;
    }

    async rollPool({open}) {

       // const roll = new Roll(`${numDice}d6${open ? 'x6' : ''}cs>${tgt}`).roll({ async: true });
       let roll = await this.rollDice(this.numDice, open, 3)

       let ob = 2;
       let evalData = this.evaluateRoll(roll, ob)
       await this.sendRollToChat(evalData) 

    // //  const roll = new Roll(`${ this.numDice}d6`, {})
    // const roll = new Roll(`{${ this.numDice}d6x}cs>3`, {})

    //     console.log(roll.terms);

    //     await roll.evaluate({async:true});

    //     const pool = PoolTerm.fromRolls([roll]);
    //     let rollFromTerms = Roll.fromTerms([pool]);
    //     rollFromTerms.toMessage();


    // const successes = roll.dice[0].results.filter(die => die.result >= 4).length;
    // const successMessage = `Rolled ${diceCount}d6: ${successes} Success${successes === 1 ? '' : 'es'}`;
    // ChatMessage.create({
    //   content: successMessage,
    //   speaker: ChatMessage.getSpeaker()
    // });
    }

    async rollPoolOpen() {

    }

    async rollDice(numDice, isOpen, target) {
        console.log(`rolling! ${numDice} dice`)
        const roll = await new Roll(`${numDice}d6${isOpen ? 'x6' : ''}cs>${target}`).evaluate({ async: true });
        if (game.dice3d) {
            return game.dice3d.showForRoll(roll, game.user, true, null, false)
                .then(_ => roll);
        }

        return roll
    }

    evaluateRoll(roll, ob) {
        console.log("roll terms", roll.terms);
        const successCount = roll.terms[0].results.filter( (r) => r.success )
        const passedTest = successCount.length >= ob
        let data = {
            ob: ob,
            passedTest,
            rollResults: roll.terms[0].results

            

        }
        return data;
    }

    async sendRollToChat(chatData) {
        let message =  await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
        return ChatMessage.create({
            content: message,
           // speaker: ChatMessage.getSpeaker({ actor })
        });

    }
}