export async function task021() {
    // refactored initialization code to use a flag for actors
    // to initialize fists, beliefs and instincts on new characters
    // only if a flag was set.
    // these items will have already been initialized on existing
    // characters so avoid re-initalizing them by setting the flag to true.
    const actors = Array.from(game.actors?.values() || []);
    for (const actor of actors) {
        for (const ownedItem of Array.from(actor.items.values())) {
            // also, the typo in the item type 'possession' has been fixed
            // any existing items need to be updated to match the new type
            if (ownedItem.type === "posession") {
                await ownedItem.update({ type: "possession" });
            }
        }
        const ms = getProperty(actor, "system.mountedstride");
        await actor.update({
            "data.mountedstride": null,
            "data.mountedStride": ms
        });
    }
    // possession item type updates need to happen in the world and all the
    // compendium packs as well.
    const items = Array.from(game.items?.values() || []);
    for (const item of items) {
        if (item.type === "posession") {
            await item.update({ type: "possession" }, {});
        }
    }
    const packs = Array.from(game.packs?.values() || []);
    for (const pack of packs) {
        if (pack.documentName === "Item") {
            const packItems = await pack.getDocuments();
            for (const item of Array.from(packItems.values())) {
                if (item.type === "posession") {
                    item.type = "possession";
                    await item.update(item.data, { pack: pack.name });
                }
            }
        }
    }
}
