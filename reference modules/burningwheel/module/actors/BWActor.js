import * as constants from "../constants.js";
import { Trait } from "../items/trait.js";
export class BWActor extends Actor {
    constructor() {
        super(...arguments);
        this.batchAdd = {
            task: -1,
            items: []
        };
    }
    async _handleBatchAdd() {
        const items = this.batchAdd.items;
        this.batchAdd.items = [];
        clearTimeout(this.batchAdd.task);
        this.batchAdd.task = -1;
        return this.createEmbeddedDocuments("Item", items);
    }
    batchAddItem(item) {
        if (this.batchAdd.task === -1) {
            this.batchAdd.task = setTimeout(() => this._handleBatchAdd(), 500);
        }
        this.batchAdd.items.push(item);
    }
    async processNewItem(item, userId) {
        if (game.userId !== userId) {
            // this item has been added by someone else.
            return;
        }
        if (item.type === "trait") {
            const trait = item;
            if (trait.addsReputation) {
                const repData = {
                    name: trait.reputationName,
                    type: "reputation",
                    img: constants.defaultImages.reputation
                };
                repData["data.dice"] = trait.reputationDice;
                repData["data.infamous"] = trait.reputationInfamous;
                repData["data.description"] = trait.text;
                this.batchAddItem(repData);
            }
            if (trait.addsAffiliation) {
                const repData = {
                    name: trait.affiliationName,
                    type: "affiliation",
                    img: constants.defaultImages.affiliation
                };
                repData["data.dice"] = trait.affiliationDice;
                repData["data.description"] = trait.text;
                this.batchAddItem(repData);
            }
        }
    }
    prepareData() {
        super.prepareData();
    }
    prepareBaseData() {
        this._prepareActorData();
    }
    getForkOptions(skillName) {
        return this.forks.filter(s => s.name !== skillName // skills reduced to 0 due to wounds can't be used as forks.
            && s.system.exp > (this.system.ptgs.woundDice || 0))
            .map(s => {
            const exp = s.system.exp;
            // skills at 7+ exp provide 2 dice in forks.
            return { name: s.name, amount: exp >= 7 ? 2 : 1 };
        });
    }
    getWildForks(skillName) {
        return this.wildForks.filter(s => s.name !== skillName // skills reduced to 0 due to wounds can't be used as forks.
            && s.system.exp > (this.system.ptgs.woundDice || 0))
            .map(s => {
            const exp = s.system.exp;
            // skills at 7+ exp provide 2 dice in forks.
            return { name: s.name, amount: exp >= 7 ? 2 : 1 };
        });
    }
    _addRollModifier(rollName, modifier, onlyNonZero = false) {
        rollName = rollName.toLowerCase();
        if (onlyNonZero && !modifier.dice && !modifier.obstacle) {
            return;
        }
        if (this.rollModifiers[rollName]) {
            this.rollModifiers[rollName].push(modifier);
        }
        else {
            this.rollModifiers[rollName] = [modifier];
        }
    }
    getRollModifiers(rollName) {
        return (this.rollModifiers[rollName.toLowerCase()] || []).concat(this.rollModifiers.all || []);
    }
    _addAptitudeModifier(name, modifier) {
        name = name.toLowerCase();
        if (Number.isInteger(this.aptitudeModifiers[name])) {
            this.aptitudeModifiers[name] += modifier;
        }
        else {
            this.aptitudeModifiers[name] = modifier;
        }
    }
    getAptitudeModifiers(name = "") {
        return (this.aptitudeModifiers || {})[name.toLowerCase()] || 0;
    }
    _prepareActorData() {
        this.rollModifiers = {};
        this.callOns = {};
        this.aptitudeModifiers = {};
        this._calculateClumsyWeight();
        this.forks = [];
        this.wildForks = [];
        this.circlesBonus = [];
        this.circlesMalus = [];
        this.martialSkills = [];
        this.socialSkills = [];
        this.sorcerousSkills = [];
        this.toolkits = [];
        this.fightWeapons = [];
        if (this.items) {
            this.items.forEach((item) => {
                const { system: i, name, type } = item;
                switch (type) {
                    case "skill":
                        if (!i.learning &&
                            !i.training) {
                            if (i.wildFork) {
                                this.wildForks.push(item);
                            }
                            else {
                                this.forks.push(item);
                            }
                        }
                        if (i.skilltype === "martial" &&
                            !i.training) {
                            this.martialSkills.push(item);
                        }
                        else if (i.skilltype === "sorcerous") {
                            this.sorcerousSkills.push(item);
                        }
                        else if (i.skilltype === "social") {
                            this.socialSkills.push(item);
                        }
                        break;
                    case "reputation":
                        const rep = i;
                        if (rep.infamous) {
                            this.circlesMalus.push({ name: name, amount: rep.dice });
                        }
                        else {
                            this.circlesBonus.push({ name: name, amount: rep.dice });
                        }
                        break;
                    case "affiliation":
                        this.circlesBonus.push({ name: name, amount: i.dice });
                        break;
                    case "trait":
                        const t = i;
                        if (t.traittype === "die") {
                            if (t.hasDieModifier && t.dieModifierTarget) {
                                t.dieModifierTarget.split(',').forEach(target => this._addRollModifier(target.trim(), Trait.asRollDieModifier(name, t)));
                            }
                            if (t.hasObModifier && t.obModifierTarget) {
                                t.obModifierTarget.split(',').forEach(target => this._addRollModifier(target.trim(), Trait.asRollObModifier(name, t)));
                            }
                        }
                        if (t.traittype === "call-on") {
                            if (t.callonTarget) {
                                this._addCallon(t.callonTarget, name);
                            }
                        }
                        if (t.hasAptitudeModifier) {
                            t.aptitudeTarget.split(',').forEach((target) => this._addAptitudeModifier(target.trim(), t.aptitudeModifier));
                        }
                        break;
                    case "possession":
                        if (i.isToolkit) {
                            this.toolkits.push(item);
                        }
                        break;
                    case "spell":
                    case "melee weapon":
                    case "ranged weapon":
                        this.fightWeapons.push(item);
                        break;
                }
            });
        }
    }
    _addCallon(callonTarget, name) {
        callonTarget.split(',').forEach(s => {
            if (this.callOns[s.trim().toLowerCase()]) {
                this.callOns[s.trim().toLowerCase()].push(name);
            }
            else {
                this.callOns[s.trim().toLowerCase()] = [name];
            }
        });
    }
    getCallons(roll) {
        return this.callOns[roll.toLowerCase()] || [];
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        if (this.items.contents.length) {
            return; // this is most likely a duplicate of an existing actor. we don't need to add default items.
        }
        if (game.userId !== userId) {
            // we aren't the person who created this actor
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.createEmbeddedDocuments("Item", [
            { name: "Instinct 1", type: "instinct", data: {}, img: constants.defaultImages.instinct },
            { name: "Instinct 2", type: "instinct", data: {}, img: constants.defaultImages.instinct },
            { name: "Instinct 3", type: "instinct", data: {}, img: constants.defaultImages.instinct },
            { name: "Instinct Special", type: "instinct", data: {}, img: constants.defaultImages.instinct },
            { name: "Belief 1", type: "belief", data: {}, img: constants.defaultImages.belief },
            { name: "Belief 2", type: "belief", data: {}, img: constants.defaultImages.belief },
            { name: "Belief 3", type: "belief", data: {}, img: constants.defaultImages.belief },
            { name: "Belief Special", type: "belief", data: {}, img: constants.defaultImages.belief },
            { ...constants.bareFistData, img: "icons/skills/melee/unarmed-punch-fist-yellow-red.webp" }
        ]);
    }
    async _preCreate(actor, _options, user) {
        await super._preCreate(actor, _options, user);
        if (actor.type === 'character' || actor.type === 'npc') {
            this.prototypeToken.updateSource({
                disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                sight: { enabled: true }
            });
        }
        if (actor.type === 'character' || actor.type === 'setting') {
            this.prototypeToken.updateSource({
                actorLink: true,
                disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
            });
        }
    }
    _calculateClumsyWeight() {
        const clumsyWeight = {
            agilityPenalty: 0,
            speedObPenalty: 0,
            speedDiePenalty: 0,
            climbingPenalty: 0,
            healthFortePenalty: 0,
            throwingShootingPenalty: 0,
            stealthyPenalty: 0,
            swimmingPenalty: 0,
            helmetObPenalty: 0,
            untrainedHealth: 0,
            untrainedAll: 0
        };
        const charData = this.type === "character" ? this.system : undefined;
        this.items.filter((i) => (i.type === "armor" && i.system.equipped))
            .forEach((i) => {
            const a = i.system;
            if (a.hasHelm) {
                clumsyWeight.helmetObPenalty = a.perceptionObservationPenalty || 0;
            }
            if (a.hasTorso) {
                clumsyWeight.healthFortePenalty = Math.max(clumsyWeight.healthFortePenalty, a.healthFortePenalty || 0);
                clumsyWeight.stealthyPenalty = Math.max(clumsyWeight.stealthyPenalty, a.stealthyPenalty || 0);
            }
            if (a.hasLeftArm || a.hasRightArm) {
                clumsyWeight.agilityPenalty = Math.max(clumsyWeight.agilityPenalty, a.agilityPenalty || 0);
                clumsyWeight.throwingShootingPenalty = Math.max(clumsyWeight.throwingShootingPenalty, a.throwingShootingPenalty || 0);
            }
            if (a.hasLeftLeg || a.hasRightLeg) {
                clumsyWeight.speedDiePenalty = Math.max(clumsyWeight.speedDiePenalty, a.speedDiePenalty || 0);
                clumsyWeight.speedObPenalty = Math.max(clumsyWeight.speedObPenalty, a.speedObPenalty || 0);
                clumsyWeight.climbingPenalty = Math.max(clumsyWeight.climbingPenalty, a.climbingPenalty || 0);
            }
            if (charData && !charData.settings.armorTrained &&
                (a.hasHelm || a.hasLeftArm || a.hasRightArm || a.hasTorso || a.hasLeftLeg || a.hasRightLeg)) {
                // if this is more than just a shield
                if (a.untrainedPenalty === "plate") {
                    clumsyWeight.untrainedAll = Math.max(clumsyWeight.untrainedAll, 2);
                    clumsyWeight.untrainedHealth = 0;
                }
                else if (a.untrainedPenalty === "heavy") {
                    clumsyWeight.untrainedAll = Math.max(clumsyWeight.untrainedAll, 1);
                    clumsyWeight.untrainedHealth = 0;
                }
                else if (a.untrainedPenalty === "light" && clumsyWeight.untrainedAll === 0) {
                    clumsyWeight.untrainedHealth = 1;
                }
            }
        });
        if (charData) {
            charData.clumsyWeight = clumsyWeight;
        }
        const baseModifier = { optional: true, label: "Armor Clumsy Weight" };
        this._addRollModifier("climbing", { obstacle: clumsyWeight.climbingPenalty, ...baseModifier }, true);
        this._addRollModifier("perception", { obstacle: clumsyWeight.helmetObPenalty, ...baseModifier }, true);
        this._addRollModifier("observation", { obstacle: clumsyWeight.helmetObPenalty, ...baseModifier }, true);
        this._addRollModifier("shooting", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("bow", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("throwing", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("crossbow", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("firearms", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("agility", { obstacle: clumsyWeight.agilityPenalty, ...baseModifier }, true);
        this._addRollModifier("speed", { dice: -clumsyWeight.speedDiePenalty, ...baseModifier }, true);
        this._addRollModifier("speed", { obstacle: clumsyWeight.speedObPenalty, ...baseModifier }, true);
        this._addRollModifier("health", { obstacle: clumsyWeight.healthFortePenalty, ...baseModifier }, true);
        this._addRollModifier("forte", { obstacle: clumsyWeight.healthFortePenalty, ...baseModifier }, true);
        this._addRollModifier("stealthy", { obstacle: clumsyWeight.stealthyPenalty, ...baseModifier }, true);
        this._addRollModifier("swimming", { obstacle: clumsyWeight.swimmingPenalty, ...baseModifier }, true);
        this._addRollModifier("all", { obstacle: clumsyWeight.untrainedAll, label: "Untrained Armor Penalty", optional: true }, true);
        this._addRollModifier("health", { obstacle: clumsyWeight.untrainedHealth, label: "Untrained Armor", optional: true }, true);
        this._addRollModifier("forte", { obstacle: clumsyWeight.untrainedHealth, label: "Untrained Armor", optional: true }, true);
    }
    updateArthaForSkill(_skillId, persona, deeds) {
        const updateData = {};
        updateData["data.deeds"] = this.system.deeds - (deeds ? 1 : 0);
        updateData["data.persona"] = this.system.persona - persona;
        this.update(updateData);
    }
    updateArthaForStat(accessor, persona, deeds) {
        const updateData = {};
        updateData["data.deeds"] = this.system.deeds - (deeds ? 1 : 0);
        updateData["data.persona"] = this.system.persona - persona;
        this.update(updateData);
    }
}
