import * as helpers from "../helpers.js";
import { getNoDiceErrorDialog, rollDice, templates } from "./rolls.js";
export async function handleTraitorReroll(target, isDeeds = false) {
    const actor = game.actors?.get(target.dataset.actorId || "");
    const accessor = (target.dataset.accessor || '').replace('system.', '');
    const name = target.dataset.rollName || '';
    const itemId = target.dataset.itemId || '';
    const rollArray = target.dataset.dice?.split(',').map(r => parseInt(r)) || [];
    const splitRollArray = target.dataset.splitDice?.split(',').map(r => parseInt(r)) || [];
    const successes = parseInt(target.dataset.successes || "0");
    const obstacleTotal = parseInt(target.dataset.difficulty || "0");
    const splitSuccesses = parseInt(target.dataset.splitSuccesses || "0");
    if (isDeeds && actor.system.deeds == 0) {
        return helpers.notifyError(game.i18n.localize('BW.roll.noDeedsTitle'), game.i18n.localize('BW.roll.noDeedsMessage'));
    }
    let rollStat;
    if (["stat", "learning"].includes(target.dataset.rerollType || "")) {
        rollStat = getProperty(actor, `system.${accessor}`);
    }
    else {
        rollStat = actor.items.get(itemId).system;
    }
    const successTarget = rollStat.shade === "B" ? 3 : (rollStat.shade === "G" ? 2 : 1);
    const numDice = rollArray.filter(r => r <= successTarget).length || 0;
    const numSplitDice = splitRollArray.filter(r => r <= successTarget).length || 0;
    const reroll = numDice ? await rollDice(numDice, rollStat.open, rollStat.shade) : undefined;
    const splitReroll = numSplitDice ? await rollDice(numSplitDice, rollStat.open, rollStat.shade) : undefined;
    let newSuccesses = 0;
    let success = false;
    if (!numDice && !numSplitDice) {
        return getNoDiceErrorDialog(0);
    }
    const updateData = {};
    updateData["data.deeds"] = isDeeds ? actor.system.deeds - 1 : undefined;
    if (reroll) {
        newSuccesses = reroll.total || 0;
        success = (newSuccesses + successes) >= obstacleTotal;
        if (actor.type === "character") {
            const char = actor;
            // only characters worry about turning failures into successes.
            // NPCs don't track things closely enough.
            if (target.dataset.rerollType === "stat") {
                if (successes <= obstacleTotal && success) {
                    // we turned a failure into a success. we might need to retroactively award xp.
                    if (target.dataset.ptgsAction) { // shrug/grit flags may need to be set.
                        updateData[`data.ptgs.${target.dataset.ptgsAction}`] = true;
                        actor.update(updateData);
                    }
                    if (actor.successOnlyRolls.indexOf(name.toLowerCase()) !== -1) {
                        if (!helpers.isStat(name)) {
                            char.addAttributeTest(getProperty(actor, `system.${accessor}`), name, accessor, target.dataset.difficultyGroup, true);
                        }
                        else {
                            char.addStatTest(getProperty(actor, `system.${accessor}`), name, accessor, target.dataset.difficultyGroup, true);
                        }
                    }
                }
                updateData[`system.${accessor}.deeds`] = isDeeds ? parseInt(getProperty(actor, `system.${accessor}.deeds`) || "0") + 1 : undefined;
            }
            else if (target.dataset.rerollType === "learning") {
                const learningTarget = target.dataset.learningTarget || 'skill';
                if (actor.successOnlyRolls.includes(learningTarget) && successes <= obstacleTotal && success) {
                    // we need to give perception a success that was not counted
                    char.addStatTest(getProperty(actor, `system.${learningTarget}`), learningTarget.titleCase(), accessor, target.dataset.difficultyGroup, true);
                }
                updateData[`system.${accessor}.deeds`] = isDeeds ? parseInt(getProperty(actor, `system.${accessor}.deeds`) || "0") + 1 : undefined;
            }
            else if (target.dataset.rerollType === "skill" && isDeeds) {
                const skill = actor.items.get(itemId);
                await skill?.update({ "data.deeds": skill.system.deeds + 1 }, {});
            }
        }
    }
    let newSplitSuccesses = 0;
    if (splitReroll) {
        newSplitSuccesses = splitReroll.total || 0;
    }
    actor.update(updateData);
    const data = {
        title: game.i18n.localize(isDeeds ? "BW.roll.savingGraceReroll" : "BW.roll.callonReroll"),
        rolls: rollArray.map(r => { return { roll: r, success: r > successTarget }; }),
        splitRolls: splitRollArray.map(r => { return { roll: r, success: r > successTarget }; }),
        rerolls: reroll?.dice[0].results.map(r => { return { roll: r.result, success: r.success || false }; }) || [],
        splitRerolls: splitReroll?.dice[0].results.map(r => { return { roll: r.result, success: r.success || false }; }) || [],
        successes,
        obstacleTotal,
        newSuccesses,
        success,
        splitSuccesses,
        newSplitSuccesses
    };
    const html = await renderTemplate(templates.rerollChatMessage, data);
    return ChatMessage.create({
        content: html,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
