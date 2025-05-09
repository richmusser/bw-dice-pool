export async function task061() {
    const items = Array.from(game.items?.values() || []);
    const updateInfo = {};
    for (const item of items) {
        const updateData = updateItem(item, updateInfo);
        if (Object.values(updateData).length) {
            await item.update(updateData, {});
        }
    }
    const actors = Array.from(game.actors?.values() || []);
    for (const actor of actors) {
        for (const ownedItem of Array.from(actor.items?.values() || [])) {
            const updateData = updateItem(ownedItem, updateInfo);
            if (Object.values(updateData).length) {
                await ownedItem.update(updateData, {});
            }
        }
    }
    const packs = Array.from(game.packs?.values() || []);
    for (const pack of packs) {
        if (pack.documentName === "Item") {
            const packItems = await pack.getDocuments();
            for (const item of packItems) {
                const updateData = updateItem(item, updateInfo);
                if (Object.values(updateData).length) {
                    await item.update(updateData, {});
                }
            }
        }
    }
    const updatedTypes = Object.keys(updateInfo);
    const parts = [];
    for (const types of updatedTypes) {
        parts.push(`${updateInfo[types]} ${types}s`);
    }
    const message = updatedTypes.length ? `Updated ${parts.join(", ")}.` : "No entities needed to be updated.";
    ui.notifications?.notify(message, "info");
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateToNumber(value, path, data) {
    if (typeof value === "number") {
        return;
    }
    if (value && typeof value === "object") {
        // this is an array
        value = value[0];
    }
    if (typeof value === "string") {
        value = parseInt(value);
    }
    if (value !== null) {
        data[path] = value;
    }
}
function updateItem(item, updateInfo) {
    let updateData = {};
    switch (item.type) {
        case "armor":
            updateData = updateArmor(item);
            break;
        case "skill":
            updateData = updateSkill(item);
            break;
        case "trait":
            updateData = updateTrait(item);
            break;
        case "spell":
            updateData = updateSpell(item);
            break;
        case "ranged weapon":
            updateData = updateRanged(item);
            break;
        case "reputation":
            updateData = updateReputation(item);
            break;
        case "affiliation":
            updateData = updateAffiliation(item);
    }
    if (Object.values(updateData).length) {
        if (updateInfo[item.type]) {
            updateInfo[item.type]++;
        }
        else {
            updateInfo[item.type] = 1;
        }
    }
    return updateData;
}
function updateArmor(item) {
    const data = {};
    updateToNumber(item.system.dice, "dice", data);
    updateToNumber(item.system.damageHelm, "damageHelm", data);
    updateToNumber(item.system.damageLeftArm, "damageLeftArm", data);
    updateToNumber(item.system.damageLeftLeg, "damageLeftLeg", data);
    updateToNumber(item.system.damageRightArm, "damageRightArm", data);
    updateToNumber(item.system.damageRightLeg, "damageRightLeg", data);
    updateToNumber(item.system.damageTorso, "damageTorso", data);
    updateToNumber(item.system.damageShield, "damageShield", data);
    return data;
}
function updateSkill(item) {
    const data = {};
    updateToNumber(item.system.exp, "exp", data);
    updateToNumber(item.system.challenging, "challenging", data);
    updateToNumber(item.system.routine, "routine", data);
    updateToNumber(item.system.difficult, "difficult", data);
    updateToNumber(item.system.fate, "fate", data);
    updateToNumber(item.system.persona, "persona", data);
    updateToNumber(item.system.deeds, "deeds", data);
    updateToNumber(item.system.learningProgress, "learningProgress", data);
    return data;
}
function updateTrait(item) {
    const data = {};
    updateToNumber(item.system.affiliationDice, "affiliationDice", data);
    updateToNumber(item.system.dieModifier, "dieModifier", data);
    updateToNumber(item.system.obModifier, "obModifier", data);
    updateToNumber(item.system.reputationDice, "reputationDice", data);
    updateToNumber(item.system.aptitudeModifier, "aptitudeModifier", data);
    return data;
}
function updateSpell(item) {
    const data = {};
    updateToNumber(item.system.willDamageBonus, "willDamageBonus", data);
    updateToNumber(item.system.learningProgress, "learningProgress", data);
    updateToNumber(item.system.va, "va", data);
    updateToNumber(item.system.optimalRange, "optimalRange", data);
    updateToNumber(item.system.extremeRange, "extremeRange", data);
    return data;
}
function updateRanged(item) {
    const data = {};
    updateToNumber(item.system.incidental, "incidental", data);
    updateToNumber(item.system.incidentalRoll, "incidentalRoll", data);
    updateToNumber(item.system.mark, "mark", data);
    updateToNumber(item.system.markRoll, "markRoll", data);
    updateToNumber(item.system.superb, "superb", data);
    updateToNumber(item.system.vsArmor, "vsArmor", data);
    updateToNumber(item.system.optimalRange, "optimalRange", data);
    updateToNumber(item.system.extremeRange, "extremeRange", data);
    updateToNumber(item.system.powerBonus, "powerBonus", data);
    return data;
}
function updateReputation(item) {
    const data = {};
    updateToNumber(item.system.dice, "dice", data);
    return data;
}
function updateAffiliation(item) {
    const data = {};
    updateToNumber(item.system.dice, "dice", data);
    return data;
}
