var _ = require("underscore");
var request = require("request");
var natural = require("natural");

var action = require("./nlp");
var host = "http://127.0.0.1:8000";

// the query

// stem a whole array
var stemArray = function(array) {
  stems = [];
  array.forEach(function(i) {
    stems.push( natural.PorterStemmer.stem(i) );
  });

  return stems;
}


// finds the record that matches the best, out of all the choices
var getCorrectRecord = function(raw, callback) {
  action(raw, {}, function(data) {

    // sample services list
    // plugins = [
    //   {
    //     name: "gmail",
    //     desc: "Check email remotely",
    //     id: 0,
    //     tags: ["email", "gmail", "mail", "webmail"],
    //     data: {}
    //   }
    // ]

    // console.log(data)

    // function() {
      // var plugins = JSON.parse(body).data;
      var plugins = [
        {
          name: "basementled",
          desc: "sample plugin",
          location: "basement",
          data: {
            led: {
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

      // try to match the query to a plugin
      var count = [];
      _.each(plugins, function(p) {
        inputTotal = 0;
        _.each(data.words, function(word) {

          // find the common synonyms/tags between the plugin and the word
          // all parts of the plugin (that matter)
          allparts = _.compact( _.union([p.name], p.desc.split(' '), p.tags, [p.location]));
          // common words
          var common = _.intersection(word.synonyms, allparts);

          if (common.length) {
            // get the length of the matched words
            pct = _.reduce(common, function(memo, val) {
              return memo + val.length;
            }, 0);

            // add it to the total of matched words for the input
            inputTotal += pct;
          }

        });

        // add the total to the collective count
        count.push(inputTotal);
      });

      // console.log(count)


      // now, find out which plugin won
      var winner = _.max(count);
      if (winner > 1) {
        var winningPlugin = plugins[count.indexOf(winner)];
        // console.log("contest winner had value of", winner, "matching chars", winningPlugin);

        // print the winners
        callback({
          raw: raw,
          words: data.words,
          actions: data.actions,
          winner: winningPlugin,
          winningValue: winner
        });
      } else {
        // not within threshhold
        callback(null);
      }
    // }();

  });
};

var getDataItemWithinInfo = function(str, callback) {
  getCorrectRecord(str, function(winned) {
    // console.log(typeof winned.words)

    // no matches for the string
    if (!winned) {
      callback(null);
      return
    }

    // what type of request?
    _.each(typeTests, function(explst, type) {
      _.each(explst, function(exp) {
        m = exp.exec(winned.raw);
        if (m && m.length) {

          // get the operation done (look for the key name
          // like 'enable')
          operation = _.invert(typeTests)[
            _.filter(typeTests, function(tv, tk) {
              return tv === exp || _.contains(tv, exp);
            })
          ];

          // ok, got the request type.
          // what exactly are we testing?

          // go through each data item, and
          // get its value. Then, compare it to
          // the main corpus

          // create main corpus (stems of all parts of the original phrase)
          maincorpus = stemArray(winned.raw.split(" "));

          // create place to store ranks
          dataRanks = [];

          // get data items
          _.each(winned.winner.data, function(v, kk) {
            item = [v.label || kk];

            // calculate rank for this data item
            dataRanks.push({
              name: kk,
              value: _.intersection(
                stemArray(item),
                maincorpus
              ).length
            });

          });

          // now, calculate the highest 'score'
          winnerScore = _.max(
            dataRanks.map(function(item) {
              return item.value;
            })
          );

          // which name equates to that score?
          dataWinnerName = dataRanks.filter(function(item) {
            return item.value == winnerScore;
          });

          // and, do some more formatting
          if (dataWinnerName.length) {
            dataWinner = dataWinnerName[0].name
            callback(winned.winner, operation, dataWinner);
          } else {
            console.log("No clue which data item we're talking about")
          }

        }
      });
    });

  });


};

// perform the query
var str = process.argv.slice(2).join(" ");
var typeTests = {
  equality: [/(.*) equals?(?: to)? (.*)/gi],
  enable: [/(.*) on (?:the )?(.*)/gi, /enable/gi]
}
getDataItemWithinInfo(str, function(thing, operation, dataItem) {
  if (thing) {
    console.log(thing, operation, dataItem)
  } else {
    console.log("You need to be more discriptive (your description matched nothing)")
  }
})
