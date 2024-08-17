export async function buildHelpDialog({ exponent, path, skillId, actor, helpedWith }) {
    const data = {
        exponent
    };
    const content = await renderTemplate("systems/burningwheel/templates/dialogs/help-dialog.hbs", data);
    const help = game.i18n.localize('BW.roll.help');
    return new Dialog({
        title: game.i18n.localize('BW.roll.helpTitle'),
        content: content,
        buttons: {
            help: {
                label: help,
                callback: () => {
                    registerHelpEntry({ path, skillId, actor, exponent, helpedWith });
                }
            }
        },
        default: "help"
    }).render(true);
}
async function registerHelpEntry({ path, skillId, actor, exponent, helpedWith }) {
    const modifiers = game.burningwheel.modifiers;
    modifiers.addHelp({
        dice: exponent,
        skillId,
        path,
        actor,
        title: actor.name,
        helpedWith
    });
}
