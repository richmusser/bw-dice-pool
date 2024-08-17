import { AffiliationSheet } from "./sheets/affiliation-sheet.js";
import { ArmorSheet } from "./sheets/armor-sheet.js";
import { BeliefSheet } from "./sheets/belief-sheet.js";
import { InstinctSheet } from "./sheets/instinct-sheet.js";
import { MeleeWeaponSheet } from "./sheets/melee-sheet.js";
import { PossessionSheet } from "./sheets/possession-sheet.js";
import { PropertySheet } from "./sheets/property-sheet.js";
import { RangedWeaponSheet } from "./sheets/ranged-sheet.js";
import { RelationshipSheet } from "./sheets/relationship-sheet.js";
import { ReputationSheet } from "./sheets/reputation-sheet.js";
import { SkillSheet } from "./sheets/skill-sheet.js";
import { TraitSheet } from "./sheets/trait-sheet.js";
import { SpellSheet } from "./sheets/spell-sheet.js";
import * as constants from "../constants.js";
import { LifepathSheet } from "./sheets/lifepath-sheet.js";
import { simpleBroadcast } from "../chat.js";
export * from "./sheets/affiliation-sheet.js";
export * from "./sheets/armor-sheet.js";
export * from "./sheets/belief-sheet.js";
export * from "./sheets/instinct-sheet.js";
export * from "./sheets/melee-sheet.js";
export * from "./sheets/possession-sheet.js";
export * from "./sheets/property-sheet.js";
export * from "./sheets/ranged-sheet.js";
export * from "./sheets/relationship-sheet.js";
export * from "./sheets/reputation-sheet.js";
export * from "./sheets/skill-sheet.js";
export * from "./sheets/trait-sheet.js";
export * from "./sheets/spell-sheet.js";
export class BWItem extends Item {
    async generateChatMessage(speaker) {
        return simpleBroadcast({ title: this.name, mainText: `Type - ${this.type}` }, speaker);
    }
    prepareData() {
        super.prepareData();
        this.hasOwner = !!(this.actor && this.actor.system);
    }
    _preCreate(data, options, user) {
        super._preCreate(data, options, user);
        const entity = this;
        if (entity.type && entity._source.img === "icons/svg/item-bag.svg") {
            this.updateSource({ "img": constants.defaultImages[data.type] });
        }
    }
}
export function RegisterItemSheets() {
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet(constants.systemName, BeliefSheet, {
        types: ["belief"],
        makeDefault: true,
        label: "BW.sheet.belief"
    });
    Items.registerSheet(constants.systemName, InstinctSheet, {
        types: ["instinct"],
        makeDefault: true,
        label: "BW.sheet.instinct"
    });
    Items.registerSheet(constants.systemName, TraitSheet, {
        types: ["trait"],
        makeDefault: true,
        label: "BW.sheet.trait"
    });
    Items.registerSheet(constants.systemName, SkillSheet, {
        types: ["skill"],
        makeDefault: true,
        label: "BW.sheet.skill"
    });
    Items.registerSheet(constants.systemName, RelationshipSheet, {
        types: ["relationship"],
        makeDefault: true,
        label: "BW.sheet.relationship"
    });
    Items.registerSheet(constants.systemName, PossessionSheet, {
        types: ["possession"],
        makeDefault: true,
        label: "BW.sheet.possession"
    });
    Items.registerSheet(constants.systemName, PropertySheet, {
        types: ["property"],
        makeDefault: true,
        label: "BW.sheet.property"
    });
    Items.registerSheet(constants.systemName, MeleeWeaponSheet, {
        types: ["melee weapon"],
        makeDefault: true,
        label: "BW.sheet.meleeWeapon"
    });
    Items.registerSheet(constants.systemName, RangedWeaponSheet, {
        types: ["ranged weapon"],
        makeDefault: true,
        label: "BW.sheet.rangedWeapon"
    });
    Items.registerSheet(constants.systemName, ArmorSheet, {
        types: ["armor"],
        makeDefault: true,
        label: "BW.sheet.armor"
    });
    Items.registerSheet(constants.systemName, ReputationSheet, {
        types: ["reputation"],
        makeDefault: true,
        label: "BW.sheet.reputation"
    });
    Items.registerSheet(constants.systemName, AffiliationSheet, {
        types: ["affiliation"],
        makeDefault: true,
        label: "BW.sheet.affiliation"
    });
    Items.registerSheet(constants.systemName, SpellSheet, {
        types: ["spell"],
        makeDefault: true,
        label: "BW.sheet.spell"
    });
    Items.registerSheet(constants.systemName, LifepathSheet, {
        types: ["lifepath"],
        makeDefault: true,
        label: "BW.sheet.lifepath"
    });
}
