import * as settings from './settings.js'   

export function getDifficulty(dice, ob) {

    if (settings.useEasyDifficulty()) {

        // mmake the test one notch easier 
        if (dice <= 2) {
            return 'Routine/Difficult'
        }
        else if (dice == 3) {
            if( ob >= dice ) {
                return 'Challenging'
            }
            else if (dice - ob <= 1) {
                return 'Difficult'
            }
            else {
                return 'Routine'
            }
        }
        else if (dice < 7) {
            if (ob >= dice) {
                return 'Challenging'
            }
            else if (dice - ob <= 1) {
                return 'Difficult'
            }
            else if (dice - ob <= 2) {
                return 'Difficult'
            }
            else {
                return 'Routine'
            }
        }
        else { // 7+
            if (ob >= dice) {
                return 'Challenging'
            }
            else if (dice - ob <= 1) {
                return 'Difficult'
            }
            else if (dice - ob <= 2) {
                return 'Difficult'
            }
            else if (dice - ob <= 3) {
                return 'Difficult'
            }
            else {
                return 'Routine'
            }
        }

    }
    else {
        // use the difficult as defined in the rules
        if (ob > dice) {
            return 'Challenging'
        }
        else if (dice === 1) {
            return 'Routine/Difficult'
        }
        else if (dice <= 3) {
            if (ob === dice)
                return 'Difficult'
            else
                return 'Routine'
        }
        else if (dice <= 7) {
            if (dice - ob <= 1)
                return 'Difficult'
            else
                return 'Routine'
        }
        else {
            if (dice - ob <= 2)
                return 'Difficult'
            else
                return 'Routine'
        }

    }


}


