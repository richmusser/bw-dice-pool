import { rollDice, templates, extractNumber, getRollNameClass, buildRerollData, extractBaseData, buildDiceSourceObject } from "./rolls.js";
export async function handleArmorRollEvent({ target, sheet }) {
    const actor = sheet.actor;
    const armorId = target.dataset.itemId || "";
    const armorItem = actor.items.get(armorId);
    const location = target.dataset.location || "";
    const chestBonus = location.toLowerCase() === "torso" ? 1 : 0;
    const damage = armorItem?.system[`damage${location}`];
    const dialogData = {
        difficulty: 1,
        name: game.i18n.format('BW.xTest', { name: game.i18n.localize('BW.roll.armor') }),
        arthaDice: 0,
        bonusDice: 0,
        armor: (armorItem?.system.dice || 0) + chestBonus,
        damage,
        showObstacles: true,
        showDifficulty: true,
    };
    const html = await renderTemplate(templates.armorDialog, dialogData);
    return new Dialog({
        title: game.i18n.localize('BW.roll.rollArmor'),
        content: html,
        buttons: {
            roll: {
                label: game.i18n.localize("BW.roll.roll"),
                callback: (html) => armorRollCallback(armorItem, html, sheet, location)
            }
        },
        default: "roll"
    }).render(true);
}
export async function armorRollCallback(armorItem, html, sheet, location) {
    const dice = extractNumber(html, "armor");
    const damage = parseInt(armorItem.system[`damage${location}`]);
    const va = extractNumber(html, "vsArmor");
    const actor = armorItem.actor;
    const baseData = extractBaseData(html, sheet);
    const dieSources = {
        Armor: `+${dice}`,
    };
    if (damage) {
        dieSources.Damage = `-${damage}`;
    }
    const numDice = dice - damage;
    const roll = await rollDice(numDice, false, armorItem.system.shade || "B");
    if (!roll) {
        return;
    }
    const damageAssigned = await armorItem.assignDamage(roll, location);
    const isSuccess = (roll.total || 0) >= 1 + va;
    const rerollData = buildRerollData({ actor, roll, itemId: armorItem.id });
    rerollData.type = "armor";
    const extraInfo = damageAssigned ?
        game.i18n.localize('BW.roll.armorDiceLostMessage')
            .replace("{item}", armorItem.name)
            .replace("{location}", localizeLocation(location))
            .replace("{number}", damageAssigned.toString())
            .replace("{dice}", game.i18n.localize(damageAssigned > 1 ? "BW.dice" : "BW.die"))
        : undefined;
    const messageData = {
        name: game.i18n.format('BW.xTest', { name: game.i18n.localize('BW.roll.armor') }),
        successes: "" + roll.dice[0].total,
        success: isSuccess,
        rolls: roll.dice[0].results,
        difficulty: 1 + va,
        nameClass: getRollNameClass(false, armorItem.system.shade || "B"),
        difficultyGroup: "N/A",
        obstacleTotal: 1 + va,
        callons: [],
        fateReroll: rerollData,
        dieSources: {
            ...dieSources,
            ...buildDiceSourceObject(0, baseData.aDice, baseData.bDice, 0, 0, 0)
        },
        extraInfo
    };
    const messageHtml = await renderTemplate(templates.armorMessage, messageData);
    return ChatMessage.create({
        content: messageHtml,
        speaker: ChatMessage.getSpeaker({ actor: armorItem.actor })
    });
}
function localizeLocation(location) {
    return game.i18n.localize(`BW.armor.${location[0].toLowerCase()}${location.slice(1)}`);
}
