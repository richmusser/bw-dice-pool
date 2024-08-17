import { buildRerollData, getRollNameClass, rollDice, templates, extractRollData, rollWildFork, mergeDialogData, getSplitPoolText, getSplitPoolRoll } from "./rolls.js";
import { byName, notifyError } from "../helpers.js";
import { handleNpcStatRoll } from "./npcStatRoll.js";
import { buildHelpDialog } from "../dialogs/buildHelpDialog.js";
export async function handleNpcWeaponRollEvent({ target, sheet, dataPreset }) {
    const skillId = target.dataset.skillId || "";
    const itemId = target.dataset.weaponId || "";
    if (!skillId) {
        return notifyError("No Weapon Skill", "No Weapon Skill Chosen. Set the sheet into edit mode and pick a Martial skill to use with this weapon.");
    }
    const skill = sheet.actor.items.get(skillId);
    const weapon = sheet.actor.items.get(itemId);
    const attackIndex = parseInt(target.dataset.attackIndex);
    return handleNpcWeaponRoll({
        actor: sheet.actor,
        weapon,
        skill,
        attackIndex,
        dataPreset
    });
}
export async function handleNpcWeaponRoll({ actor, weapon, skill, attackIndex, dataPreset }) {
    if (!weapon) {
        return notifyError("Missing Weapon", "The weapon that is being cast appears to be missing from the character sheet.");
    }
    const extraInfo = weapon.type === "melee weapon" ?
        await weapon.getWeaponMessageData(attackIndex || 0) :
        await weapon.getWeaponMessageData();
    return handleNpcSkillRoll({ actor, skill, extraInfo, dataPreset });
}
export async function handleNpcSpellRollEvent({ target, sheet, dataPreset }) {
    const skillId = target.dataset.skillId || "";
    const itemId = target.dataset.spellId || "";
    if (!skillId) {
        return notifyError("No Sorcerous Skill", "No Casting Skill Chosen. Set the sheet into edit mode and pick a Sorcerous skill to use with this weapon.");
    }
    const skill = sheet.actor.items.get(skillId);
    const spell = sheet.actor.items.get(itemId);
    return handleNpcSpellRoll({ actor: sheet.actor, spell, skill, dataPreset });
}
export async function handleNpcSpellRoll({ actor, spell, skill, dataPreset }) {
    if (!spell) {
        return notifyError("Missing Spell", "The spell that is being cast appears to be missing from the character sheet.");
    }
    const obstacle = spell.system.variableObstacle ? 3 : spell.system.obstacle;
    if (dataPreset) {
        dataPreset.difficulty = obstacle;
    }
    else {
        dataPreset = { difficulty: obstacle };
    }
    dataPreset.useCustomDifficulty = dataPreset.showObstacles = dataPreset.showDifficulty = true;
    const extraInfo = await spell.getSpellMessageData();
    return handleNpcSkillRoll({ actor, skill, extraInfo, dataPreset });
}
export async function handleNpcSkillRollEvent({ target, sheet, extraInfo, dataPreset }) {
    const actor = sheet.actor;
    const skill = actor.items.get(target.dataset.skillId || "");
    return handleNpcSkillRoll({ actor, skill, extraInfo, dataPreset });
}
export async function handleNpcSkillRoll({ actor, skill, extraInfo, dataPreset }) {
    dataPreset = dataPreset || {};
    dataPreset.deedsPoint = actor.system.deeds !== 0;
    if (dataPreset && dataPreset.addHelp) {
        // add a test log instead of testing
        return buildHelpDialog({
            exponent: skill.system.exp,
            skillId: skill.id,
            actor,
            helpedWith: skill.name
        });
    }
    if (actor.system.persona) {
        dataPreset.personaOptions = Array.from(Array(Math.min(actor.system.persona, 3)).keys());
    }
    if (skill.system.learning) {
        const accessor = skill.system.root1;
        if (dataPreset) {
            dataPreset.learning = true;
        }
        else {
            dataPreset = { learning: true };
        }
        const stat = getProperty(actor.system, accessor);
        const rollData = {
            dice: stat.exp,
            shade: stat.shade,
            open: stat.open,
            statName: game.i18n.localize("BW." + skill.system.root1),
            accessor: skill.system.root1,
            actor,
            extraInfo,
            dataPreset
        };
        if (skill.system.root2) {
            // learning skill that requires a stat choice for rolling
            return new Dialog({
                title: "Pick which base stat to use",
                content: "<p>The listed skill uses one of two possible roots. Pick one to roll.</p>",
                buttons: {
                    root1: {
                        label: skill.system.root1.titleCase(),
                        callback: () => handleNpcStatRoll(rollData)
                    },
                    root2: {
                        label: skill.system.root2.titleCase(),
                        callback: () => {
                            const stat2 = getProperty(actor.system, `${skill.system.root2}`);
                            rollData.dice = stat2.exp;
                            rollData.shade = stat2.shade;
                            rollData.open = stat2.open;
                            rollData.statName = game.i18n.localize("BW." + skill.system.root2);
                            rollData.accessor = skill.system.root2;
                            return handleNpcStatRoll(rollData);
                        }
                    }
                },
                default: "root1"
            }).render(true);
        }
        return handleNpcStatRoll(rollData);
    }
    const rollModifiers = actor.getRollModifiers(skill.name);
    const data = mergeDialogData({
        name: game.i18n.format("BW.xTest", { name: skill.name }),
        difficulty: 3,
        bonusDice: 0,
        arthaDice: 0,
        woundDice: actor.system.ptgs.woundDice,
        obPenalty: actor.system.ptgs.obPenalty,
        skill: skill.system,
        needsToolkit: skill.system.tools,
        toolkits: actor.toolkits,
        forkOptions: actor.getForkOptions(skill.name).sort(byName),
        wildForks: actor.getWildForks(skill.name).sort(byName),
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: !game.burningwheel.useGmDifficulty,
        showObstacles: !game.burningwheel.useGmDifficulty
            || !!actor.system.ptgs.obPenalty
            || ((dataPreset && dataPreset.obModifiers && !!dataPreset.obModifiers.length) || false)
    }, dataPreset);
    const html = await renderTemplate(templates.npcRollDialog, data);
    return new Promise(_resolve => new Dialog({
        title: data.name,
        content: html,
        buttons: {
            roll: {
                label: game.i18n.localize("BW.roll.roll"),
                callback: async (dialogHtml) => skillRollCallback(dialogHtml, actor, skill, extraInfo)
            }
        },
        default: "roll"
    }).render(true));
}
async function skillRollCallback(dialogHtml, actor, skill, extraInfo) {
    const rollData = extractRollData(dialogHtml);
    const dg = rollData.difficultyGroup;
    const roll = await rollDice(rollData.diceTotal, skill.system.open, skill.system.shade);
    if (!roll) {
        return;
    }
    const wildForkDie = await rollWildFork(rollData.wildForks, skill.system.shade);
    const wildForkBonus = wildForkDie?.total || 0;
    const wildForkDice = wildForkDie?.results || [];
    const isSuccessful = parseInt(roll.result) + wildForkBonus >= rollData.difficultyTotal;
    let splitPoolString;
    let splitPoolRoll;
    if (rollData.splitPool) {
        splitPoolRoll = await getSplitPoolRoll(rollData.splitPool, skill.system.open, skill.system.shade);
        splitPoolString = getSplitPoolText(splitPoolRoll);
    }
    extraInfo = `${splitPoolString || ""} ${extraInfo || ""}`;
    const fateReroll = buildRerollData({ actor, roll, itemId: skill.id, splitPoolRoll });
    const callons = actor.getCallons(skill.name).map(s => {
        return { label: s, ...buildRerollData({ actor, roll, splitPoolRoll, itemId: skill.id }) };
    });
    // because artha isn't tracked individually, it doesn't matter what gets updated.
    // both cases here end up just subtracting the artha spent.
    actor.updateArthaForStat("", rollData.persona, rollData.deeds);
    if (rollData.addHelp) {
        game.burningwheel.modifiers.grantTests(rollData.difficultyTestTotal, isSuccessful);
    }
    const data = {
        name: game.i18n.format("BW.xTest", { name: skill.name }),
        successes: '' + (parseInt(roll.result) + wildForkBonus),
        splitSuccesses: splitPoolRoll ? splitPoolRoll.result : undefined,
        difficulty: rollData.baseDifficulty,
        obstacleTotal: rollData.difficultyTotal,
        nameClass: getRollNameClass(skill.system.open, skill.system.shade),
        success: isSuccessful,
        rolls: roll.dice[0].results,
        wildRolls: wildForkDice,
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
