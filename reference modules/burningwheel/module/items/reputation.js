import { BWItem } from "./item.js";
export class Reputation extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.cssClass = this.system.infamous ? "reputation-infamous" : "reputation-famous";
    }
}
