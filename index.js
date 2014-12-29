var _ = require("underscore");
var request = require("request");
var natural = require("natural");

var action = require("./nlp");
var host = "http://127.0.0.1:8000";

// the query

module.exports = Parser = function() {
  var root = this;

  // the data to search over
  this.data = [];

  // all possible types
  this.phraseTypes = {
    equality: [/(.*) equals?(?: to)? (.*)/gi],
    enable: [/(.*) on (?:the )?(.*)/gi, /enable/gi],
    disable: [/(.*) off (?:the )?(.*)/gi, /enable/gi],
    toggle: [/toggle/gi, /flip/gi],
    status_default_false: [/is (?:.*) ?off/gi, /is (?:.*) ?false/gi],
    status_default_true: [/is (?:.*) ?on/gi, /is (?:.*) ?true/gi],
    status: [/is/gi, /status/gi, /value/gi]
  };

  // add data to the parser instance
  this.addData = function(data) {
    this.data = data;
  };

  // break down the phrase into a more descriptive, structured form
  this.breakDownPhrase = function(raw, callback) {
    action(raw, {}, function(data) {

        // try to match the query to a plugin
        var count = [];
        _.each(root.data, function(p) {
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
          var winningPlugin = root.data[count.indexOf(winner)];
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

  this.matchMeaning = function(str, callback) {

    // start by breaking down the phrase into a more manageable form
    this.breakDownPhrase(str, function(winned) {

      // no matches for the string
      if (!winned) {
        callback(null);
        return
      }

      // what type of request?
      _.each(root.phraseTypes, function(explst, type) {
        _.each(explst, function(exp) {
          m = exp.exec(winned.raw);
          if (m && m.length) {

            // get the operation done (look for the key name
            // like 'enable')
            operation = _.invert(root.phraseTypes)[
              _.filter(root.phraseTypes, function(tv, tk) {
                return tv === exp || _.contains(tv, exp);
              })
            ];

            // ok, got the request type.
            // what exactly are we testing?

            // go through each data item, and
            // get its value. Then, compare it to
            // the main corpus

            // create main corpus (stems of all parts of the original phrase)
            maincorpus = root.stemArray(winned.raw.split(" "));

            // create place to store ranks
            dataRanks = [];

            // get data items
            _.each(winned.winner.data, function(v, kk) {
              item = [v.label || kk];

              // calculate rank for this data item
              dataRanks.push({
                name: kk,
                value: _.intersection(
                  root.stemArray(item),
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

              // note: if there are mutiple winners with the same score, then
              // the first will be chosen
              dataWinner = dataWinnerName[0].name

              // Finally, callback!
              callback(winned.winner, operation, dataWinner);
            } else {
              callback(winned.winner, operation, null);
            }

          }
        });
      });

    });


  };

  // stem a whole array
  this.stemArray = function(array) {
    stems = [];
    array.forEach(function(i) {
      stems.push( natural.PorterStemmer.stem(i) );
    });

    return stems;
  };

};

// // set up the parser
// p = new Parser();
// p.data = [
//   {
//     name: "basementled",
//     desc: "sample plugin",
//     location: "basement",
//     data: {
//       led: {
//         value: false
//       },
//       lamp: {
//         value: false
//       }
//     }
//   },
//   {
//     name: "kitchenled",
//     desc: "sample plugin",
//     location: "kitchen",
//     data: {
//       led: {
//         value: false
//       }
//     }
//   }
// ];
//
// // do the query
// p.matchMeaning(process.argv.slice(2).join(" "), function(thing, operation, dataItem) {
//   if (thing) {
//     console.log(thing.name, operation, dataItem)
//   } else if (!thing) {
//     console.log("You need to be more discriptive (your description matched nothing)");
//   } else if (!dataItem) {
//     console.log("No clue which data item we're talking about within the thing");
//   } else {
//     console.log("Something really weird happened -> No real error message.");
//   };
// });
