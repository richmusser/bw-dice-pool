export function registerSettings() {


    game.settings.register(
        'bw-dice-pool',
        'getSetsOb',
        {
            name: 'GM sets the obstacle for tests',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true,
            onChange: () => location.reload(),
        }
    );

}

export function getGmSetsOb() {
    return game.settings.get('bw-dice-pool', 'getSetsOb');
}

export function setGmSetsOb(value) {
    game.settings.set('bw-dice-pool', 'getSetsOb', value);
}
