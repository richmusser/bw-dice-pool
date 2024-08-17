import { BWItem } from "./item.js";
import * as helpers from "../helpers.js";
import { translateWoundValue } from "../helpers.js";
export class MeleeWeapon extends BWItem {
    prepareData() {
        super.prepareData();
        const actorData = this.actor;
        if (actorData && actorData.system) {
            let power = actorData.system.power.exp;
            if (actorData.system.power.shade === "G") {
                power += 2;
            }
            if (actorData.system.power.shade === "W") {
                power += 3;
            }
            Object.values(this.system.attacks || []).forEach(ad => {
                const baseDmg = power + ad.power;
                ad.incidental = Math.ceil(baseDmg / 2);
                ad.mark = baseDmg;
                ad.superb = Math.floor(baseDmg * 1.5);
            });
        }
        this.system.cssClass = "equipment-weapon";
    }
    async getWeaponMessageData(attackIndex) {
        const element = document.createElement("div");
        element.className = "weapon-extra-info";
        element.appendChild(helpers.DivOfText(`${this.name} ${this.system.attacks[attackIndex].attackName}`, "ims-title shade-black"));
        element.appendChild(helpers.DivOfText("I", "ims-header"));
        element.appendChild(helpers.DivOfText("M", "ims-header"));
        element.appendChild(helpers.DivOfText("S", "ims-header"));
        element.appendChild(helpers.DivOfText("Add", "ims-header"));
        element.appendChild(helpers.DivOfText("Va", "ims-header"));
        element.appendChild(helpers.DivOfText("Length", "ims-header"));
        element.appendChild(helpers.DivOfText(translateWoundValue(this.system.shade, this.system.attacks[attackIndex].incidental || 1)));
        element.appendChild(helpers.DivOfText(translateWoundValue(this.system.shade, this.system.attacks[attackIndex].mark || 1)));
        element.appendChild(helpers.DivOfText(translateWoundValue(this.system.shade, this.system.attacks[attackIndex].superb || 1)));
        element.appendChild(helpers.DivOfText(this.system.attacks[attackIndex].add));
        element.appendChild(helpers.DivOfText(this.system.attacks[attackIndex].vsArmor));
        element.appendChild(helpers.DivOfText(this.system.attacks[attackIndex].weaponLength.titleCase()));
        return element.outerHTML;
    }
    _preCreate(data, options, user) {
        super._preCreate(data, options, user);
        if (data.name === 'Bare Fist') {
            this.updateSource({
                name: game.i18n.localize('BW.weapon.bareFist'),
                'system.description': game.i18n.localize('BW.weapon.bareFistDescription')
            });
        }
    }
}
