export function shadeToTarget(shade) {
    if (shade === 'B')
      return 3
    else if (shade === 'G')
      return 2
    else if (shade === 'W')
      return 1
  }

export function shadeLabel(shade) {
    if (shade === 'B')
      return "Black"
    else if (shade === 'G')
      return "Gray"
    else if (shade === 'W')
      return "White"

  }