import { BWItem } from "./item.js";
export class Property extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.cssClass = "equipment-property";
    }
}
