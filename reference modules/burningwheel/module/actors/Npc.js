import { BWActor } from "./BWActor.js";
export class Npc extends BWActor {
    prepareData() {
        super.prepareData();
        this.calculateWounds();
    }
    calculateWounds() {
        this.system.ptgs.woundDice =
            (this.system.ptgs.suTaken >= 3 ? 1 : 0) +
                (this.system.ptgs.liTaken) +
                (this.system.ptgs.miTaken * 2) +
                (this.system.ptgs.seTaken * 3) +
                (this.system.ptgs.trTaken * 4);
        this.system.ptgs.obPenalty =
            (this.system.ptgs.suTaken > 0 && this.system.ptgs.suTaken < 3) ? 1 : 0;
    }
}
