Imperative
===

This module was originally created for [Que](http://github.com/queapp/core) to
parse queries (in the form of commands), take the contents of those queries, and
parse it into the thing it acts upon, the action, and the item within the thing
that the thing pertains to.

Try this Example
---
```javascript
// set up the parser
p = new (require("./"))();
p.data = [
  {
    name: "basementled",
    desc: "sample plugin",
    location: "basement",
    data: {
      led: {
        value: false
      },
      lamp: {
        value: false
      }
    }
  },
  {
    name: "kitchenled",
    desc: "sample plugin",
    location: "kitchen",
    data: {
      led: {
        value: false
      }
    }
  }
];

// do the query
p.matchMeaning("turn on the basement lamp", function(thing, operation, dataItem) {
  if (thing) {
    console.log(thing.name, operation, dataItem)
  } else if (!thing) {
    console.log("You need to be more discriptive (your description matched nothing)");
  } else if (!dataItem) {
    console.log("No clue which data item we're talking about within the thing");
  } else {
    console.log("Something really weird happened -> No real error message.");
  };
})
```
