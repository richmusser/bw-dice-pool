export function registerSettings() {


    game.settings.register('bw-dice-pool', 'obstacle', {
        scope: 'world',
        type: Number,
        default: 3
    })

    game.settings.register(
        'bw-dice-pool',
        'gmSetsDifficulty',
        {
            name: 'GM sets the difficulty',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true,
            onChange: () => location.reload(),
        }
    );


}

export function getGMSetDifficulty() {
    return game.settings.get('bw-dice-pool', 'gmSetsDifficulty');
}

export function setGMSetDifficulty(value) {
    game.settings.set('bw-dice-pool', 'gmSetsDifficulty', value);
}

export function getOb() {
    return game.settings.get('bw-dice-pool', 'obstacle');
}

export function setOb(value) {
    game.settings.set('bw-dice-pool', 'obstacle', value);
}
