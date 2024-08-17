import * as helpers from "../helpers.js";
import { buildRerollData, getRollNameClass, rollDice, templates, extractSelectString, maybeExpendTools, rollWildFork, extractRollData, mergeDialogData, getSplitPoolText, getSplitPoolRoll } from "./rolls.js";
import { buildHelpDialog } from "../dialogs/buildHelpDialog.js";
export async function handleSkillRollEvent({ target, sheet, dataPreset, extraInfo, onRollCallback }) {
    const skillId = target.dataset.skillId || "";
    const skill = sheet.actor.items.get(skillId);
    const actor = sheet.actor;
    return handleSkillRoll({ actor, skill, dataPreset, extraInfo, onRollCallback });
}
export async function handleSkillRoll({ actor, skill, dataPreset, extraInfo, onRollCallback }) {
    if (dataPreset && dataPreset.addHelp) {
        // add a test log instead of testing
        return buildHelpDialog({
            exponent: skill.system.exp,
            skillId: skill.id,
            actor,
            helpedWith: skill.name
        });
    }
    const rollModifiers = actor.getRollModifiers(skill.name);
    const templateData = mergeDialogData({
        name: game.i18n.format('BW.xTest', { name: skill.name }),
        difficulty: 3,
        bonusDice: 0,
        arthaDice: 0,
        woundDice: actor.system.ptgs.woundDice,
        obPenalty: actor.system.ptgs.obPenalty,
        skill: skill.system,
        needsToolkit: skill.system.tools,
        toolkits: actor.toolkits,
        forkOptions: actor.getForkOptions(skill.name).sort(helpers.byName),
        wildForks: actor.getWildForks(skill.name).sort(helpers.byName),
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: !game.burningwheel.useGmDifficulty,
        showObstacles: !game.burningwheel.useGmDifficulty
            || !!actor.system.ptgs.obPenalty
            || (dataPreset && dataPreset.obModifiers && !!dataPreset.obModifiers.length || false)
    }, dataPreset);
    const html = await renderTemplate(templates.pcRollDialog, templateData);
    return new Promise(_resolve => new Dialog({
        title: templateData.name,
        content: html,
        buttons: {
            roll: {
                label: game.i18n.localize("BW.roll.roll"),
                callback: async (dialogHtml) => {
                    skillRollCallback(dialogHtml, skill, actor, extraInfo);
                    if (onRollCallback) {
                        onRollCallback();
                    }
                }
            }
        },
        default: "roll"
    }).render(true));
}
async function skillRollCallback(dialogHtml, skill, actor, extraInfo) {
    const { diceTotal, difficultyTotal, wildForks, difficultyDice, baseDifficulty, obSources, dieSources, splitPool, persona, deeds, addHelp, difficultyTestTotal } = extractRollData(dialogHtml);
    const dg = helpers.difficultyGroup(difficultyDice, difficultyTotal);
    const roll = await rollDice(diceTotal, skill.system.open, skill.system.shade);
    if (!roll) {
        return;
    }
    const wildForkDie = await rollWildFork(wildForks, skill.system.shade);
    const wildForkBonus = wildForkDie?.total || 0;
    const wildForkDice = wildForkDie?.results || [];
    let splitPoolString;
    let splitPoolRoll;
    if (splitPool) {
        splitPoolRoll = await getSplitPoolRoll(splitPool, skill.system.open, skill.system.shade);
        splitPoolString = getSplitPoolText(splitPoolRoll);
    }
    extraInfo = `${splitPoolString || ""} ${extraInfo || ""}`;
    if (skill.system.tools) {
        const toolkitId = extractSelectString(dialogHtml, "toolkitId") || '';
        const tools = actor.items.get(toolkitId);
        if (tools) {
            const { expended, text } = await maybeExpendTools(tools);
            extraInfo = extraInfo ? `${extraInfo}${text}` : text;
            if (expended) {
                tools.update({
                    "data.isExpended": true
                }, {});
            }
        }
    }
    const fateReroll = buildRerollData({ actor, roll, itemId: skill.id, splitPoolRoll });
    const callons = actor.getCallons(skill.name).map(s => {
        return { label: s, ...buildRerollData({ actor, roll, itemId: skill.id, splitPoolRoll }) };
    });
    const success = (parseInt(roll.result) + wildForkBonus) >= difficultyTotal;
    if (success || actor.successOnlyRolls.indexOf(skill.name.toLowerCase()) === -1) {
        await skill.addTest(dg);
    }
    if (addHelp) {
        game.burningwheel.modifiers.grantTests(difficultyTestTotal, success);
    }
    actor.updateArthaForSkill(skill.id, persona, deeds);
    const data = {
        name: game.i18n.format('BW.xTest', { name: skill.name }),
        successes: '' + (parseInt(roll.result) + wildForkBonus),
        splitSuccesses: splitPoolRoll ? splitPoolRoll.result : undefined,
        difficulty: baseDifficulty,
        obstacleTotal: difficultyTotal,
        nameClass: getRollNameClass(skill.system.open, skill.system.shade),
        success,
        rolls: roll.dice[0].results,
        wildRolls: wildForkDice,
        difficultyGroup: dg,
        penaltySources: obSources,
        dieSources,
        fateReroll,
        callons,
        extraInfo
    };
    const messageHtml = await renderTemplate(templates.pcRollMessage, data);
    return ChatMessage.create({
        content: messageHtml,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
