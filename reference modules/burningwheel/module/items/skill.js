import { skillImages, skillRootSelect } from "../constants.js";
import { updateTestsNeeded } from "../helpers.js";
import { BWItem } from "./item.js";
import * as helpers from "../helpers.js";
export class Skill extends BWItem {
    getRootSelect() {
        const roots = {};
        const actor = this.actor;
        Object.assign(roots, skillRootSelect);
        if (!actor) {
            return roots;
        }
        if (this.hasOwner && actor.type === "character") {
            if (actor.system.custom1.name) {
                roots["custom1"] = actor.system.custom1.name;
            }
            if (actor.system.custom2.name) {
                roots["custom2"] = actor.system.custom2.name;
            }
        }
        else {
            roots["custom1"] = "Custom Attribute 1";
            roots["custom2"] = "Custom Attribute 2";
        }
        return roots;
    }
    prepareData() {
        super.prepareData();
        updateTestsNeeded(this.system);
        this.calculateAptitude();
        this.system.safeId = this.id;
    }
    calculateAptitude() {
        const actor = this.actor;
        if (!actor || !this.hasOwner) {
            return;
        }
        let aptitudeMod = actor.getAptitudeModifiers(this.name) + actor.getAptitudeModifiers(this.system.skilltype);
        aptitudeMod += actor.getAptitudeModifiers(this.system.root1);
        if (this.system.root2) {
            aptitudeMod += actor.getAptitudeModifiers(`${this.system.root1}/${this.system.root2}`)
                + actor.getAptitudeModifiers(`${this.system.root2}/${this.system.root1}`);
            +actor.getAptitudeModifiers(this.system.root2);
        }
        const root1exp = actor.system[this.system.root1].exp;
        const root2exp = this.system.root2 ? actor.system[this.system.root2].exp : root1exp;
        const rootAvg = Math.floor((root1exp + root2exp) / 2);
        this.system.aptitude = 10 - rootAvg + aptitudeMod;
    }
    static disableIfWounded(woundDice) {
        if (!this.system.learning && this.system.exp <= woundDice) {
            this.system.cssClass += " wound-disabled";
        }
    }
    canAdvance() {
        const enoughRoutine = (this.system.routine >= (this.system.routineNeeded || 0));
        const enoughDifficult = this.system.difficult >= (this.system.difficultNeeded || 0);
        const enoughChallenging = this.system.challenging >= (this.system.challengingNeeded || 0);
        if (this.system.exp === 0) {
            return enoughRoutine || enoughDifficult || enoughChallenging;
        }
        if (this.system.exp < 5) {
            // need only enough difficult or routine, not both
            return enoughRoutine && (enoughDifficult || enoughChallenging);
        }
        // otherwise, need both routine and difficult tests to advance, don't need routine anymore
        return enoughDifficult && enoughChallenging;
    }
    async advance() {
        const exp = this.system.exp;
        this.update({ data: { routine: 0, difficult: 0, challenging: 0, exp: exp + 1 } }, {});
    }
    async addTest(difficulty, force = false) {
        // if we're doing deferred tracking, register the test then skip tracking for now
        const difficultyDialog = game.burningwheel.gmDifficulty;
        if (!force && (difficultyDialog?.extendedTest)) {
            difficultyDialog?.addDeferredTest({
                actor: this.actor,
                skill: this,
                difficulty,
                name: this.name
            });
            return;
        }
        // if we're ready to assign the test, do that now.
        if (this.system.learning) {
            const progress = this.system.learningProgress;
            let requiredTests = this.system.aptitude || 10;
            let shade = getProperty(this.actor || {}, `system.${this.system.root1.toLowerCase()}`).shade;
            this.update({ "data.learningProgress": progress + 1 }, {});
            if (progress + 1 >= requiredTests) {
                if (this.system.root2 && this.actor) {
                    const root2Shade = getProperty(this.actor, `system.${this.system.root2.toLowerCase()}`).shade;
                    if (shade != root2Shade) {
                        requiredTests -= 2;
                    }
                    shade = helpers.getWorstShadeString(shade, root2Shade);
                }
                Dialog.confirm({
                    title: game.i18n.localize('BW.dialog.finishTraining').replace('{name}', this.name),
                    content: `<p>${game.i18n.localize('BW.dialog.finishTrainingText').replace('{name}', this.name)}</p>`,
                    yes: () => {
                        const updateData = {};
                        updateData["data.learning"] = false;
                        updateData["data.learningProgress"] = 0;
                        updateData["data.routine"] = 0;
                        updateData["data.difficult"] = 0;
                        updateData["data.challenging"] = 0;
                        updateData["data.shade"] = shade;
                        updateData["data.exp"] = Math.floor(this.rootStatExp / 2);
                        this.update(updateData, {});
                    },
                    no: () => { return; },
                    defaultYes: true
                });
            }
        }
        else {
            switch (difficulty) {
                case "Routine":
                    if (this.system.routine < (this.system.routineNeeded || 0)) {
                        this.system.routine++;
                        this.update({ "data.routine": this.system.routine }, {});
                    }
                    break;
                case "Difficult":
                    if (this.system.difficult < (this.system.difficultNeeded || 0)) {
                        this.system.difficult++;
                        this.update({ "data.difficult": this.system.difficult }, {});
                    }
                    break;
                case "Challenging":
                    if (this.system.challenging < (this.system.challengingNeeded || 0)) {
                        this.system.challenging++;
                        this.update({ "data.challenging": this.system.challenging }, {});
                    }
                    break;
                case "Routine/Difficult":
                    if (this.system.routine < (this.system.routineNeeded || 0)) {
                        this.system.routine++;
                        this.update({ "data.routine": this.system.routine }, {});
                    }
                    else if (this.system.difficult < (this.system.difficultNeeded || 0)) {
                        this.system.difficult++;
                        this.update({ "data.difficult": this.system.difficult }, {});
                    }
                    break;
            }
        }
        if (this.canAdvance()) {
            Dialog.confirm({
                title: `Advance ${this.name}?`,
                content: `<p>${this.name} is ready to advance. Go ahead?</p>`,
                yes: () => this.advance(),
                no: () => { return; },
                defaultYes: true
            });
        }
    }
    get rootStatExp() {
        if (this.actor) {
            const actor = this.actor;
            const root1exp = actor.system[this.system.root1].exp;
            const root2exp = this.system.root2 ? actor.system[this.system.root2].exp : root1exp;
            let exp = Math.floor((root1exp + root2exp) / 2);
            if (this.system.root2) {
                const root1Shade = actor.system[this.system.root1].shade;
                const root2Shade = this.system.root2 ? actor.system[this.system.root2].shade : root1Shade;
                if (root1Shade != root2Shade) {
                    exp++;
                }
            }
            return exp;
        }
        else {
            return 0;
        }
    }
    async _preUpdate(changed, options, userId) {
        await super._preUpdate(changed, options, userId);
        if (changed.system?.skilltype && this.img === skillImages[this.system.skilltype]) {
            // we should update the image for this skill
            changed.img = skillImages[changed.system?.skilltype];
        }
    }
}
