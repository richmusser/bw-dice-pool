 export function getActor() {
        // Get the first controlled token's actor
        // This assumes that the user has at least one token controlled
        // If no tokens are controlled, it will return undefined

      let controlledTokens = canvas.tokens.controlled;
      console.log("Controlled Tokens:", controlledTokens);

    if (controlledTokens.length > 0) {
      let firstControlledToken = controlledTokens[0];
      let actor = firstControlledToken.actor;
      console.log("The actor of the first controlled token is:", actor);
      return actor; // Return the actor object
      // You can then work with the 'actor' object, e.g., actor.name, actor.system.hp.value
    } else {
      console.log("No tokens are currently controlled by the user.");
      return null;
    }
  }
