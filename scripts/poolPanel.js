export class PoolPanel extends Application {

    numDice = 0

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

            //game.burningwheel.macros.rollSkill(0,0)

            console.log("*****")
            this.render();
        })
    }

    getData() {
        const data = super.getData();
        data.numDice = this.numDice;
        return data;
    }
}