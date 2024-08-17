import { CreateSkillRollMacro, RollSKillMacro } from "./SkillMacro.js";
import * as constants from "../constants.js";
import { CreateMeleeRollMacro, RollMeleeMacro } from "./MeleeMacro.js";
import { CreateRangedRollMacro, RollRangedMacro } from "./RangedMacro.js";
import { CreateSpellRollMacro, RollSpellMacro } from "./SpellMacro.js";
import { CreateEditMacro, RollEditMacro } from "./EditMacro.js";
import { CreateStatMacro, RollStatMacro } from "./StatMacro.js";
export function CreateBurningWheelMacro(data, slot) {
    if (!handlers[data.type || ""]) {
        return true;
    }
    createAndAssignMacro(data, slot);
    return false;
}
async function createAndAssignMacro(data, slot) {
    const macroData = handlers[data.type || ""](data);
    if (macroData) {
        // Check if an identical macro already exists. Create it otherwise.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let macro = game.macros?.contents.find(m => (m.name === macroData.name) && (m.command === macroData.command));
        if (!macro) {
            macro = await Macro.create({
                name: macroData.name,
                img: macroData.img,
                command: macroData.command,
                flags: macroData.flags,
                type: "script"
            });
        }
        await game.user?.assignHotbarMacro(macro, slot);
    }
}
function CreateItemMacro(dragData) {
    const itemType = dragData.data?.type || "";
    if (handlers[itemType]) {
        return handlers[itemType](dragData);
    }
    return null;
}
export function RegisterMacros() {
    game.burningwheel.macros = game.burningwheel.macros || {};
    game.burningwheel.macros['rollSkill'] = RollSKillMacro;
    game.burningwheel.macros['rollMelee'] = RollMeleeMacro;
    game.burningwheel.macros['rollRanged'] = RollRangedMacro;
    game.burningwheel.macros['rollSpell'] = RollSpellMacro;
    game.burningwheel.macros['showOwnedItem'] = RollEditMacro;
    game.burningwheel.macros['rollStat'] = RollStatMacro;
}
const handlers = {
    "Item": CreateItemMacro,
    "skill": CreateSkillRollMacro,
    "spell": CreateSpellRollMacro,
    "Melee": CreateMeleeRollMacro,
    "Ranged": CreateRangedRollMacro,
    "Stat": CreateStatMacro,
    "possession": CreateEditMacro,
    "property": CreateEditMacro,
    "armor": CreateEditMacro,
    "melee weapon": CreateEditMacro,
    "ranged weapon": CreateEditMacro,
    "trait": CreateEditMacro,
    "relationship": CreateEditMacro,
    "reputation": CreateEditMacro,
    "affiliation": CreateEditMacro,
    "belief": CreateEditMacro,
    "instinct": CreateEditMacro,
};
/* ============== Macro Helpers =============== */
export function getMacroRollPreset(actor) {
    const dataPreset = {};
    if (game.settings.get(constants.systemName, constants.settings.useGmDifficulty)) {
        const difficultyDialog = game.burningwheel.gmDifficulty;
        const helpDialog = game.burningwheel.modifiers;
        if (difficultyDialog.splitPool) {
            dataPreset.offerSplitPool = true;
        }
        if (difficultyDialog.customDiff) {
            dataPreset.showDifficulty = true;
            dataPreset.showObstacles = true;
        }
        if (difficultyDialog.help) {
            dataPreset.addHelp = true;
        }
        dataPreset.optionalObModifiers = helpDialog.mods.map(m => { return { obstacle: m.amount, label: m.name, optional: true }; });
    }
    dataPreset.deedsPoint = actor.system.deeds !== 0;
    if (actor.system.persona) {
        dataPreset.personaOptions = Array.from(Array(Math.min(actor.system.persona, 3)).keys());
    }
    return dataPreset;
}
export function getImage(image, type) {
    if (image === "icons/svg/mystery-man.svg") {
        return constants.defaultImages[type];
    }
    return image;
}
