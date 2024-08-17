import { handleLearningRoll } from "./rollLearning.js";
import { handleSkillRoll } from "./rollSkill.js";
import * as helpers from "../helpers.js";
import { mergePartials } from "./rolls.js";
export function handleWeaponRollEvent({ target, sheet, dataPreset }) {
    const actor = sheet.actor;
    const weaponId = target.dataset.weaponId;
    if (!weaponId) {
        throw Error("Malformed weapon roll button. Weapon ID must be specified");
    }
    const weapon = sheet.actor.items.get(weaponId);
    if (!weapon) {
        return helpers.notifyError(game.i18n.localize('BW.dialog.missingWeapon'), game.i18n.localize('BW.dialog.missingWeaponText'));
    }
    const skillId = target.dataset.skillId;
    if (!skillId) {
        return helpers.notifyError(game.i18n.localize('BW.dialog.noSkillSpecified'), game.i18n.localize('BW.dialog.weaponMissingSkill'));
    }
    const skill = sheet.actor.items.get(skillId);
    if (!skill) {
        throw Error("Provided skillID did not correspond to an owned skill.");
    }
    return handleWeaponRoll({
        actor,
        weapon,
        attackIndex: parseInt(target.dataset.attackIndex || "0"),
        skill,
        dataPreset
    });
}
export async function handleWeaponRoll({ actor, weapon, attackIndex, skill, dataPreset }) {
    const quality = weapon.system.quality;
    let weaponPreset = {};
    if (quality === "superior") {
        weaponPreset = { diceModifiers: [{ dice: 1, label: game.i18n.localize('BW.weapon.superiorQuality'), optional: false }] };
    }
    else if (quality === "poor") {
        weaponPreset = { obModifiers: [{ obstacle: 1, label: game.i18n.localize('BW.weapon.superiorQuality'), optional: false }] };
    }
    dataPreset = mergePartials(weaponPreset, dataPreset);
    let weaponExtraData;
    if (weapon.type === "melee weapon") {
        weaponExtraData = await weapon.getWeaponMessageData(attackIndex || 0);
    }
    else {
        weaponExtraData = await weapon.getWeaponMessageData();
    }
    return skill.system.learning ?
        handleLearningRoll({ actor, skill, extraInfo: weaponExtraData, dataPreset }) :
        handleSkillRoll({ actor, skill, extraInfo: weaponExtraData, dataPreset });
}
