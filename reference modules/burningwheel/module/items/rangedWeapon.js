import { BWItem } from "./item.js";
import * as helpers from "../helpers.js";
export class RangedWeapon extends BWItem {
    prepareData() {
        super.prepareData();
        const actor = this.actor;
        if (actor && actor.system && this.system.usePower) {
            let baseDmg = actor.system.power.exp + this.system.powerBonus;
            if (actor.system.power.shade === "G") {
                baseDmg += 2;
            }
            if (actor.system.power.shade === "W") {
                baseDmg += 3;
            }
            this.system.incidental = Math.ceil(baseDmg / 2);
            this.system.mark = baseDmg;
            this.system.superb = Math.floor(baseDmg * 1.5);
        }
        const incidentalRange = this.system.incidentalRoll;
        const markRange = this.system.markRoll;
        this.system.incidentalLabel = `1-${incidentalRange}`;
        this.system.markLabel = (markRange - 1 === incidentalRange) ? `${markRange}` : `${incidentalRange + 1}-${markRange}`;
        this.system.superbLabel = (markRange === 5) ? `6` : `${markRange + 1}-6`;
        this.system.cssClass = "equipment-weapon";
    }
    async getWeaponMessageData() {
        const element = document.createElement("div");
        const roll = (await new Roll("1d6").roll({ async: true })).dice[0].results[0].result;
        const incidental = roll <= (this.system.incidentalRoll || 0);
        const mark = !incidental && roll <= (this.system.markRoll || 0);
        element.className = "ranged-extra-info";
        element.appendChild(helpers.DivOfText(this.name, "ims-title shade-black"));
        element.appendChild(helpers.DivOfText("I", "ims-header"));
        element.appendChild(helpers.DivOfText("M", "ims-header"));
        element.appendChild(helpers.DivOfText("S", "ims-header"));
        element.appendChild(helpers.DivOfText("Va", "ims-header"));
        element.appendChild(helpers.DivOfText("DoF Ranges", "ims-header"));
        element.appendChild(helpers.DivOfText("Die", "ims-header"));
        element.appendChild(helpers.DivOfText(helpers.translateWoundValue(this.system.shade, this.system.incidental), incidental ? "highlight" : undefined));
        element.appendChild(helpers.DivOfText(helpers.translateWoundValue(this.system.shade, this.system.mark), mark ? "highlight" : undefined));
        element.appendChild(helpers.DivOfText(helpers.translateWoundValue(this.system.shade, this.system.superb), !incidental && !mark ? "highlight" : undefined));
        element.appendChild(helpers.DivOfText(this.system.vsArmor));
        element.appendChild(helpers.DivOfText(`${this.system.incidentalLabel}/${this.system.markLabel}/${this.system.superbLabel}`));
        element.appendChild(helpers.DivOfText("" + roll, "roll-die"));
        return element.outerHTML;
    }
    _preCreate(data, options, user) {
        super._preCreate(data, options, user);
        this.updateSource({ 'system.maxRange': game.i18n.localize("BW.weapon.hundredFiftyPaces") });
    }
}
