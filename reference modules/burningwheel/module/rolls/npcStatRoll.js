import { buildRerollData, getRollNameClass, rollDice, templates, extractRollData, mergeDialogData, getSplitPoolText, getSplitPoolRoll } from "./rolls.js";
import { buildHelpDialog } from "../dialogs/buildHelpDialog.js";
export async function handleNpcStatRollEvent({ target, sheet, dataPreset }) {
    const actor = sheet.actor;
    const dice = getProperty(actor, target.dataset.stat || "");
    const shade = getProperty(actor, target.dataset.shade || "");
    const accessor = (target.dataset.accessor || "");
    const open = target.dataset.action === "rollStatOpen";
    const statName = target.dataset.rollableName || "Unknown Stat";
    return handleNpcStatRoll({ dice, shade, open, statName, actor, dataPreset, accessor });
}
export async function handleNpcStatRoll({ dice, shade, open, statName, accessor, extraInfo, dataPreset, actor }) {
    const rollModifiers = actor.getRollModifiers(statName);
    dataPreset = dataPreset || {};
    dataPreset.deedsPoint = actor.system.deeds !== 0;
    if (actor.system.persona) {
        dataPreset.personaOptions = Array.from(Array(Math.min(actor.system.persona, 3)).keys());
    }
    if (dataPreset && dataPreset.addHelp) {
        // add a test log instead of testing
        return buildHelpDialog({
            exponent: dice,
            path: `system.${accessor}`,
            actor,
            helpedWith: statName
        });
    }
    const data = mergeDialogData({
        name: game.i18n.format("BW.xTest", { name: statName }),
        difficulty: 3,
        bonusDice: 0,
        arthaDice: 0,
        woundDice: ["circles", "resources", "health"].indexOf(accessor) === -1 ? actor.system.ptgs.woundDice : 0,
        obPenalty: ["circles", "resources", "health"].indexOf(accessor) === -1 ? actor.system.ptgs.obPenalty : 0,
        circlesBonus: accessor === "circles" ? actor.circlesBonus : undefined,
        circlesMalus: accessor === "circles" ? actor.circlesMalus : undefined,
        stat: { exp: dice },
        tax: 0,
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: !game.burningwheel.useGmDifficulty,
        showObstacles: !game.burningwheel.useGmDifficulty
            || !!actor.system.ptgs.obPenalty
            || (dataPreset && dataPreset.obModifiers && !!dataPreset.obModifiers.length || false)
    }, dataPreset);
    const html = await renderTemplate(templates.npcRollDialog, data);
    return new Promise(_resolve => new Dialog({
        title: data.name,
        content: html,
        buttons: {
            roll: {
                label: game.i18n.localize("BW.roll.roll"),
                callback: async (dialogHtml) => statRollCallback(dialogHtml, actor, statName, shade, open, extraInfo)
            }
        },
        default: "roll"
    }).render(true));
}
async function statRollCallback(dialogHtml, actor, name, shade, open, extraInfo) {
    const rollData = extractRollData(dialogHtml);
    const dg = rollData.difficultyGroup;
    const accessor = name;
    const roll = await rollDice(rollData.diceTotal, open, shade);
    if (!roll) {
        return;
    }
    const isSuccessful = parseInt(roll.result, 10) >= rollData.difficultyTotal;
    if (rollData.addHelp) {
        game.burningwheel.modifiers.grantTests(rollData.difficultyTestTotal, isSuccessful);
    }
    let splitPoolString;
    let splitPoolRoll;
    if (rollData.splitPool) {
        splitPoolRoll = await getSplitPoolRoll(rollData.splitPool, open, shade);
        splitPoolString = getSplitPoolText(splitPoolRoll);
    }
    extraInfo = `${splitPoolString || ""} ${extraInfo || ""}`;
    const fateReroll = buildRerollData({ actor, roll, splitPoolRoll, accessor });
    const callons = actor.getCallons(name).map(s => {
        return { label: s, ...buildRerollData({ actor, roll, accessor, splitPoolRoll }) };
    });
    // because artha isn't tracked individually, it doesn't matter what gets updated.
    // both cases here end up just subtracting the artha spent.
    actor.updateArthaForStat("", rollData.persona, rollData.deeds);
    const data = {
        name: `${name.titleCase()}`,
        successes: roll.result,
        splitSuccesses: splitPoolRoll ? splitPoolRoll.result : undefined,
        difficulty: rollData.baseDifficulty,
        obstacleTotal: rollData.difficultyTotal,
        nameClass: getRollNameClass(open, shade),
        success: isSuccessful,
        rolls: roll.dice[0].results,
        difficultyGroup: dg,
        penaltySources: rollData.obSources,
        dieSources: rollData.dieSources,
        fateReroll,
        callons,
        extraInfo
    };
    const messageHtml = await renderTemplate(templates.npcMessage, data);
    return ChatMessage.create({
        content: messageHtml,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
