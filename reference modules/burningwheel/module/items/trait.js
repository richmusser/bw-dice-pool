import { simpleBroadcast } from "../chat.js";
import { BWItem } from "./item.js";
export class Trait extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.isCallonTrait = this.system.traittype === "call-on";
        this.system.isDieTrait = this.system.traittype === "die";
    }
    static asRollDieModifier(name, trait) {
        return {
            label: name,
            optional: true,
            dice: trait.dieModifier || 0
        };
    }
    static asRollObModifier(name, trait) {
        return {
            label: name,
            optional: true,
            obstacle: trait.obModifier || 0
        };
    }
    async generateChatMessage(actor) {
        const extraData = [];
        if (this.system.traittype === "call-on") {
            extraData.push({
                title: "Call-on For",
                text: this.system.callonTarget
            });
        }
        else if (this.system.traittype === "die") {
            if (this.system.hasAptitudeModifier) {
                extraData.push({
                    title: "Affects Aptitude",
                    text: `${this.system.aptitudeTarget.trim()} : ${this.system.aptitudeModifier}`
                });
            }
            if (this.system.hasDieModifier) {
                extraData.push({
                    title: "Adds Dice",
                    text: `${this.system.dieModifierTarget} : ${this.system.dieModifier >= 0 ? '+' + this.system.dieModifier : this.system.dieModifier}D`
                });
            }
            if (this.system.hasObModifier) {
                extraData.push({
                    title: "Changed Obstacle",
                    text: `${this.system.obModifierTarget} : ${this.system.obModifier >= 0 ? '+' + this.system.obModifier : this.system.obModifier} Ob`
                });
            }
            if (this.system.addsAffiliation) {
                extraData.push({
                    title: "Adds an Affiliation",
                    text: `${this.system.affiliationDice}D with ${this.system.affiliationName}`
                });
            }
            if (this.system.addsReputation) {
                extraData.push({
                    title: "Adds a Reputation",
                    text: `${this.system.reputationDice}D ${this.system.reputationInfamous ? "infamous " : ""}reputation as ${this.system.reputationName}`
                });
            }
        }
        extraData.push({
            title: `${this.system.traittype.titleCase()} Trait`
        });
        const data = {
            title: this.name,
            mainText: this.system.text || "No Description Given",
            extraData
        };
        return simpleBroadcast(data, actor);
    }
}
