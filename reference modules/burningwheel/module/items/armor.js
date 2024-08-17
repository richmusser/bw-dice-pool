import { BWItem } from "./item.js";
import { rollDice } from "../rolls/rolls.js";
export class Armor extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.cssClass = "equipment-armor";
        const dice = this.system.dice;
        this.system.helmDisplayClass = this.calculateDisplayClass(dice, this.system.damageHelm);
        this.system.torsoDisplayClass = this.calculateDisplayClass(dice + 1, this.system.damageTorso);
        this.system.leftArmDisplayClass = this.calculateDisplayClass(dice, this.system.damageLeftArm);
        this.system.rightArmDisplayClass = this.calculateDisplayClass(dice, this.system.damageRightArm);
        this.system.leftLegDisplayClass = this.calculateDisplayClass(dice, this.system.damageLeftLeg);
        this.system.rightLegDisplayClass = this.calculateDisplayClass(dice, this.system.damageRightLeg);
        this.system.shieldDisplayClass = this.calculateDisplayClass(dice, this.system.damageShield);
    }
    calculateDisplayClass(dice, locationDice) {
        if (parseInt(locationDice) >= dice) {
            return "armor-broken";
        }
        return "";
    }
    async assignDamage(roll, location) {
        const num1s = roll.dice[0].results.filter(r => r.result === 1).length;
        if (num1s === 0) {
            return new Promise(r => r(0));
        }
        const locationAccessor = `data.damage${location}`;
        const damage = parseInt(getProperty(this, `system.${locationAccessor}`)) || 0;
        const updateData = {};
        let newDamage = 0;
        switch (this.system.quality) {
            case "run of the mill":
                newDamage = Math.min(this.system.dice, damage + 1);
                updateData[locationAccessor] = newDamage;
                await this.update(updateData);
                return new Promise(r => r(1));
            case "superior":
                const reroll = await rollDice(num1s, false, "B");
                if (reroll && reroll.dice[0].results.filter(r => r.result === 1).length) {
                    newDamage = Math.min(this.system.dice, damage + 1);
                    updateData[locationAccessor] = newDamage;
                    await this.update(updateData);
                    return new Promise(r => r(1));
                }
                return new Promise(r => r(0));
            default:
                newDamage = Math.min(this.system.dice, damage + num1s);
                updateData[locationAccessor] = newDamage;
                await this.update(updateData);
                return new Promise(r => r(num1s));
        }
    }
}
