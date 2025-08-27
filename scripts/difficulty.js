export function getDifficulty(dice, ob) {

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


