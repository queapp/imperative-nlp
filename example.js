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
p.matchMeaning(process.argv.slice(2).join(" "), function(thing, operation, dataItem) {
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
