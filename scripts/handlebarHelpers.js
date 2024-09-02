
export function registerHelpers() {
    Handlebars.registerHelper('times', function(n, block) {
        var accum = '';
        for(var i = 0; i < n; ++i)
            accum += block.fn(i);
        return accum;
    });


    Handlebars.registerHelper('equalsOne', function(value, options) {
        if(value === 1) {
            return options.fn(this);
          }
          return options.inverse(this);
    });

 
}

