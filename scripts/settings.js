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

    game.settings.register(
        'bw-dice-pool',
        'useEasyDifficulty',
        {
            name: 'Use lower thresholds for difficulty than RAW',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        }
    );

}

export function getGmSetsOb() {
    return game.settings.get('bw-dice-pool', 'getSetsOb');
}

export function setGmSetsOb(value) {
    game.settings.set('bw-dice-pool', 'getSetsOb', value);
}

export function useEasyDifficulty() {
    return game.settings.get('bw-dice-pool', 'useEasyDifficulty');
}

export function setUseEasyDifficulty(value) {
    game.settings.set('bw-dice-pool', 'useEasyDifficulty', value);
}
