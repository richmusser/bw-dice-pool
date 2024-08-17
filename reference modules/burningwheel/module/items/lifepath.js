import { BWItem } from "./item.js";
export class Lifepath extends BWItem {
    prepareData() {
        super.prepareData();
        const statSign = this.system.statBoost === "none" ? "" : (this.system.subtractStats ? "-" : "+");
        this.system.statString = statSign + statMap[this.system.statBoost];
    }
    _preCreate(data, options, user) {
        this.updateSource({ 'system.leads': game.i18n.localize("BW.lifepath.any") });
        return super._preCreate(data, options, user);
    }
}
const statMap = {
    "none": "&mdash;",
    "mental": "1 M",
    "physical": "1 P",
    "either": "1 M/P",
    "both": "1 M,P",
    "phystwo": "2 P",
    "menttwo": "2 M"
};
