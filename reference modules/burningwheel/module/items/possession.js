import { BWItem } from "./item.js";
export class Possession extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.cssClass = "equipment-possession";
    }
}
